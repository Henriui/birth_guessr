use axum::{
    body::Body,
    extract::connect_info::MockConnectInfo,
    http::{Request, StatusCode},
};
use baby_birth_guessr::{build_router, build_state, create_pool, run_migrations};
use baby_birth_guessr::types::DbPool;
use diesel::prelude::*;
use http_body_util::BodyExt;
use serde_json::json;
use std::net::SocketAddr;
use std::sync::OnceLock;
use tokio::sync::Mutex;
use tower::ServiceExt;

static TEST_POOL: OnceLock<DbPool> = OnceLock::new();
static TEST_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();

fn pool() -> &'static DbPool {
    TEST_POOL.get_or_init(|| {
        let database_url =
            std::env::var("DATABASE_URL").expect("DATABASE_URL must be set for tests");
        let pool = create_pool(&database_url);
        run_migrations(&pool);
        pool
    })
}

fn test_mutex() -> &'static Mutex<()> {
    TEST_MUTEX.get_or_init(|| Mutex::new(()))
}

fn reset_db() {
    let mut conn = pool().get().expect("failed to get db conn");
    diesel::sql_query("TRUNCATE TABLE guesses, invitees, events RESTART IDENTITY CASCADE")
        .execute(&mut conn)
        .expect("failed to truncate tables");
}

fn test_app() -> axum::Router {
    let state = build_state(pool().clone());

    build_router(state).layer(MockConnectInfo(SocketAddr::from(([127, 0, 0, 1], 12345))))
}

async fn json_body(res: axum::response::Response) -> serde_json::Value {
    let body = res.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).unwrap()
}

async fn create_event(app: &axum::Router, allow_guess_edits: bool) -> serde_json::Value {
    let payload = json!({
        "title": "Test Event",
        "description": "Hello",
        "due_date": "2030-01-01T12:00:00",
        "guess_close_date": null,
        "turnstile_token": "any",
        "min_weight_kg": 2.0,
        "max_weight_kg": 4.0,
        "allow_guess_edits": allow_guess_edits
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/events")
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    json_body(res).await
}

async fn get_event_by_key(app: &axum::Router, key: &str) -> axum::response::Response {
    let req = Request::builder()
        .method("GET")
        .uri(format!("/api/events/by-key/{}", key))
        .body(Body::empty())
        .unwrap();

    app.clone().oneshot(req).await.unwrap()
}

async fn get_event_guesses(app: &axum::Router, event_id: &str) -> axum::response::Response {
    let req = Request::builder()
        .method("GET")
        .uri(format!("/api/events/{}/guesses", event_id))
        .body(Body::empty())
        .unwrap();

    app.clone().oneshot(req).await.unwrap()
}

async fn submit_guess(
    app: &axum::Router,
    event_id: &str,
    guessed_date: &str,
    guessed_weight_kg: f64,
) -> serde_json::Value {
    let payload = json!({
        "display_name": "Alice",
        "guessed_date": guessed_date,
        "guessed_weight_kg": guessed_weight_kg,
        "color_hex": "#ff00aa"
    });

    let req = Request::builder()
        .method("POST")
        .uri(format!("/api/events/{}/guesses", event_id))
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    json_body(res).await
}

#[tokio::test]
async fn health_works() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let res = app
        .oneshot(Request::builder().uri("/api/health").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"ok");
}

#[tokio::test]
async fn create_event_works_in_test_env_without_turnstile() {
    let _guard = test_mutex().lock().await;
    reset_db();
    assert_eq!(
        std::env::var("APP_ENV").ok().as_deref(),
        Some("test"),
        "APP_ENV must be set to test (use scripts/test-backend.sh)"
    );

    let app = test_app();
    let v = create_event(&app, true).await;

    assert_eq!(v.get("title").and_then(|v| v.as_str()), Some("Test Event"));
    assert!(v.get("event_key").is_some());
    assert!(v.get("secret_key").is_some());
}

#[tokio::test]
async fn submit_update_and_delete_guess_flow_works() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, true).await;
    let event_id = event.get("id").and_then(|v| v.as_str()).unwrap();
    let secret_key = event.get("secret_key").and_then(|v| v.as_str()).unwrap();

    let guess_resp = submit_guess(&app, event_id, "2029-12-31T00:00:00", 3.1).await;
    let invitee_id = guess_resp
        .get(0)
        .and_then(|v| v.get("id"))
        .and_then(|v| v.as_str())
        .unwrap();

    // Update guess
    let update_payload = json!({
        "display_name": "Alice Updated",
        "guessed_date": "2029-12-30T00:00:00",
        "guessed_weight_kg": 3.4,
        "color_hex": "#00ffaa"
    });

    let update_req = Request::builder()
        .method("PUT")
        .uri(format!(
            "/api/events/{}/guesses/{}",
            event_id, invitee_id
        ))
        .header("content-type", "application/json")
        .body(Body::from(update_payload.to_string()))
        .unwrap();

    let update_res = app.clone().oneshot(update_req).await.unwrap();
    assert_eq!(update_res.status(), StatusCode::OK);
    let updated = json_body(update_res).await;
    assert_eq!(
        updated.get("display_name").and_then(|v| v.as_str()),
        Some("Alice Updated")
    );

    // Delete guess (requires Bearer secret)
    let delete_req = Request::builder()
        .method("DELETE")
        .uri(format!(
            "/api/events/{}/guesses/{}",
            event_id, invitee_id
        ))
        .header("authorization", format!("Bearer {}", secret_key))
        .body(Body::empty())
        .unwrap();

    let delete_res = app.clone().oneshot(delete_req).await.unwrap();
    assert_eq!(delete_res.status(), StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn cannot_update_guess_when_allow_guess_edits_is_false() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, false).await;
    let event_id = event.get("id").and_then(|v| v.as_str()).unwrap();

    let guess_resp = submit_guess(&app, event_id, "2029-12-31T00:00:00", 3.0).await;
    let invitee_id = guess_resp
        .get(0)
        .and_then(|v| v.get("id"))
        .and_then(|v| v.as_str())
        .unwrap();

    let update_payload = json!({
        "display_name": "Alice Updated",
        "guessed_date": "2029-12-30T00:00:00",
        "guessed_weight_kg": 3.4,
        "color_hex": "#00ffaa"
    });

    let update_req = Request::builder()
        .method("PUT")
        .uri(format!(
            "/api/events/{}/guesses/{}",
            event_id, invitee_id
        ))
        .header("content-type", "application/json")
        .body(Body::from(update_payload.to_string()))
        .unwrap();

    let update_res = app.clone().oneshot(update_req).await.unwrap();
    assert_eq!(update_res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn setting_answer_ends_event_and_blocks_new_guesses() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, true).await;
    let event_id = event.get("id").and_then(|v| v.as_str()).unwrap();
    let secret_key = event.get("secret_key").and_then(|v| v.as_str()).unwrap();

    let answer_payload = json!({
        "birth_date": "2029-12-31T00:00:00",
        "birth_weight_kg": 3.2
    });

    let answer_req = Request::builder()
        .method("POST")
        .uri(format!("/api/events/{}/answer", event_id))
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {}", secret_key))
        .body(Body::from(answer_payload.to_string()))
        .unwrap();

    let answer_res = app.clone().oneshot(answer_req).await.unwrap();
    assert_eq!(answer_res.status(), StatusCode::OK);

    // Now submitting a guess should be forbidden since event is ended
    let submit_payload = json!({
        "display_name": "Bob",
        "guessed_date": "2029-12-30T00:00:00",
        "guessed_weight_kg": 3.1,
        "color_hex": "#112233"
    });

    let submit_req = Request::builder()
        .method("POST")
        .uri(format!("/api/events/{}/guesses", event_id))
        .header("content-type", "application/json")
        .body(Body::from(submit_payload.to_string()))
        .unwrap();

    let submit_res = app.clone().oneshot(submit_req).await.unwrap();
    assert_eq!(submit_res.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn get_event_by_key_returns_created_event() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, true).await;
    let event_key = event.get("event_key").and_then(|v| v.as_str()).unwrap();

    let res = get_event_by_key(&app, event_key).await;
    assert_eq!(res.status(), StatusCode::OK);

    let fetched = json_body(res).await;
    assert_eq!(
        fetched.get("event_key").and_then(|v| v.as_str()),
        Some(event_key)
    );
    assert!(fetched.get("secret_key").is_none());
}

#[tokio::test]
async fn get_event_guesses_returns_points_after_submit() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, true).await;
    let event_id = event.get("id").and_then(|v| v.as_str()).unwrap();

    let _ = submit_guess(&app, event_id, "2029-12-31T00:00:00", 3.1).await;

    let res = get_event_guesses(&app, event_id).await;
    assert_eq!(res.status(), StatusCode::OK);

    let points = json_body(res).await;
    let arr = points.as_array().unwrap();
    assert_eq!(arr.len(), 1);
    assert_eq!(
        arr[0].get("display_name").and_then(|v| v.as_str()),
        Some("Alice")
    );
}

#[tokio::test]
async fn update_event_settings_toggles_allow_guess_edits() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, false).await;
    let event_id = event.get("id").and_then(|v| v.as_str()).unwrap();
    let secret_key = event.get("secret_key").and_then(|v| v.as_str()).unwrap();

    let payload = json!({ "allow_guess_edits": true });

    let req = Request::builder()
        .method("PUT")
        .uri(format!("/api/events/{}/settings", event_id))
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {}", secret_key))
        .body(Body::from(payload.to_string()))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let updated = json_body(res).await;
    assert_eq!(updated.get("allow_guess_edits").and_then(|v| v.as_bool()), Some(true));
}

#[tokio::test]
async fn update_event_description_requires_secret_and_persists() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, true).await;
    let event_id = event.get("id").and_then(|v| v.as_str()).unwrap();
    let secret_key = event.get("secret_key").and_then(|v| v.as_str()).unwrap();

    let payload = json!({ "description": "New description" });

    // Without secret -> forbidden
    let bad_req = Request::builder()
        .method("PUT")
        .uri(format!("/api/events/{}/description", event_id))
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap();
    let bad_res = app.clone().oneshot(bad_req).await.unwrap();
    assert_eq!(bad_res.status(), StatusCode::FORBIDDEN);

    // With secret -> ok
    let ok_req = Request::builder()
        .method("PUT")
        .uri(format!("/api/events/{}/description", event_id))
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {}", secret_key))
        .body(Body::from(payload.to_string()))
        .unwrap();
    let ok_res = app.clone().oneshot(ok_req).await.unwrap();
    assert_eq!(ok_res.status(), StatusCode::OK);

    let updated = json_body(ok_res).await;
    assert_eq!(
        updated.get("description").and_then(|v| v.as_str()),
        Some("New description")
    );
}

#[tokio::test]
async fn claim_event_requires_secret() {
    let _guard = test_mutex().lock().await;
    reset_db();
    let app = test_app();

    let event = create_event(&app, true).await;
    let event_id = event.get("id").and_then(|v| v.as_str()).unwrap();
    let secret_key = event.get("secret_key").and_then(|v| v.as_str()).unwrap();

    let bad_req = Request::builder()
        .method("POST")
        .uri(format!("/api/events/{}/claim", event_id))
        .body(Body::empty())
        .unwrap();
    let bad_res = app.clone().oneshot(bad_req).await.unwrap();
    assert_eq!(bad_res.status(), StatusCode::FORBIDDEN);

    let ok_req = Request::builder()
        .method("POST")
        .uri(format!("/api/events/{}/claim", event_id))
        .header("authorization", format!("Bearer {}", secret_key))
        .body(Body::empty())
        .unwrap();
    let ok_res = app.clone().oneshot(ok_req).await.unwrap();
    assert_eq!(ok_res.status(), StatusCode::OK);
}

import { useEffect } from 'react';

type TurnstileProps = {
  onSuccess?: (token: string) => void;
  siteKey?: string;
};

export function Turnstile({ onSuccess }: TurnstileProps) {
  useEffect(() => {
    onSuccess?.('test-token');
  }, [onSuccess]);

  return null;
}

import { useEffect } from 'react';
import { navigate } from 'gatsby';

export default function NotFoundPage() {
  useEffect(() => {
    navigate('/');
  }, []);

  return null;
}

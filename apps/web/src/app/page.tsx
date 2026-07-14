import { redirect } from 'next/navigation';
import { PROTECTED_ROUTES } from '@car-spa/shared';

export default function HomePage() {
  redirect(PROTECTED_ROUTES.dashboard);
}

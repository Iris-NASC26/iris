import { reviewRequired } from '@/server/reviewRequired';

export async function GET() {
  return reviewRequired();
}

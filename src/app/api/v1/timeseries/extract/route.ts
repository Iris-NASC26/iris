import { reviewRequired } from '@/server/reviewRequired';

export async function POST() {
  return reviewRequired();
}

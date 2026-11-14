import { ReviewRequired } from '@/components/dashboard/ReviewRequired';
export default function LegacyJobPage() { return <ReviewRequired title="Legacy extraction result" message="This job belongs to the earlier prototype store. Its source identity and QA need review before it can be used in the shared application. Select an approved source to load a new series." />; }

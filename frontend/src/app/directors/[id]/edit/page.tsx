import EditDirectorClient from './EditDirectorClient';

export function generateStaticParams() {
  return [{ id: '_shell' }];
}

export default function Page() {
  return <EditDirectorClient />;
}

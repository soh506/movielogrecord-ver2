import EditMovieClient from './EditMovieClient';

export function generateStaticParams() {
  return [{ id: '_shell' }];
}

export default function Page() {
  return <EditMovieClient />;
}

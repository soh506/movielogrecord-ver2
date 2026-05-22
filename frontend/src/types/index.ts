export type Director = {
  id: number;
  name: string;
};

export type Log = {
  id: number;
  text: string;
  rating: number | null;
  created_at: string;
  username: string | null;
  movie: number;
};

export type Movie = {
  id: number;
  title: string;
  watch_date: string;
  director: number;
  director_name: string;
  logs: Log[];
};

export type AgendaItems = {
  [key: string]: AgendaItem;
};

export type AgendaItem = {
  id: string;
  title: string;
};

export type CreateItemOptions = {
  title: string;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  user_id?: string;
  client_id?: string;
  client_name?: string;
};

export type NotificationFeed = {
  notifications: AppNotification[];
  unread_count: number;
};

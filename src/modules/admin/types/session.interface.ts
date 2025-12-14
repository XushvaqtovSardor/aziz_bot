export interface AdminSession {
  userId: number;
  state: AdminState;
  step: number;
  data: any;
}

export enum AdminState {
  IDLE = 'IDLE',
  CREATING_FIELD = 'CREATING_FIELD',
  CREATING_MOVIE = 'CREATING_MOVIE',
  CREATING_SERIAL = 'CREATING_SERIAL',
  CREATING_CHANNEL = 'CREATING_CHANNEL',
  CREATING_ADMIN = 'CREATING_ADMIN',
}

export interface FieldCreationData {
  name?: string;
  channelLink?: string;
}

export interface MovieCreationData {
  code?: string;
  title?: string;
  year?: number;
  genre?: string;
  imdb?: number;
  description?: string;
  fieldId?: number;
  thumbnailFileId?: string;
  videoFileId?: string;
}

export interface SerialCreationData {
  code?: string;
  title?: string;
  year?: number;
  genre?: string;
  imdb?: number;
  description?: string;
  season?: number;
  episodeCount?: number;
  fieldId?: number;
  thumbnailFileId?: string;
}

export interface ChannelCreationData {
  channelName?: string;
  channelLink?: string;
  channelId?: string;
}

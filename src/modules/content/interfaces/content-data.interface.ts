export interface MovieData {
  code: string;
  title: string;
  posterFileId: string;
  videoFileId: string;
  videoMessageId: string;
  genre?: string;
  language?: string;
  quality?: string;
  description?: string;
  year?: number;
  fieldId: number;
}

export interface SerialData {
  code: string;
  title: string;
  posterFileId: string;
  description?: string;
  genre?: string;
  hasCustomChannel: boolean;
  customChannelId?: string;
  customChannelLink?: string;
  fieldId: number;
}

export interface EpisodeData {
  serialId: number;
  episodeNumber: number;
  title?: string;
  description?: string;
  videoFileId: string;
  videoMessageId: string;
}

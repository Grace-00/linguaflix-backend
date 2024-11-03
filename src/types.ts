export type ShowFilePath = {
  [showName: string]: string;
};

//TODO: optimise for more episodes/shows
export const SHOW_FILE_PATH: ShowFilePath = {
  "Station 19": "../subtitles/station-19-s07e01-en.srt",
  "9-1-1": "../subtitles/9-1-1-s08e01-en.srt",
};

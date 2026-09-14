/* @ifantasy/feed — public surface */
export { FeedProvider, useFeed, MOUNT_RADIUS } from './FeedProvider';
export { FeedViewport } from './FeedViewport';
export { MediaStage } from './MediaStage';
export { MediaFrame } from './MediaFrame';
export type { MediaFrameProps } from './MediaFrame';
export {
  BANDS, BAND_METRES, bandLabel, nextBand, normaliseBand, unitsFor,
} from './bands';
export type { Units } from './bands';
export { VideoFrame, SoundButton, useSound, isSoundOn, setSoundOn, canAutoplay } from './VideoFrame';
export type { AutoplayPref, VideoFrameProps } from './VideoFrame';
export { GestureLayer, useCardActions } from './GestureLayer';
export { EndCard, EmptyCard, ErrorCard } from './EndCard';
export { VerifiedBadge, MetaLine, Tags, ActionRow, Bio, PersonBody, BandChip, shortDate } from './cardParts';
export { escortsSlots, escortsFetchPage, fetchCities } from './skinEscorts';
export { arrangementsSlots, arrangementsFetchPage } from './skinArrangements';
export { creatorSlots } from './skinCreator';
export type { GestureLayerProps, CardAction } from './GestureLayer';
export type { MediaStageProps } from './MediaStage';
export type { FeedSlots } from './FeedViewport';
export { themes, themeVars, escorts, arrangements, creator } from './theme';
export { useDecisions } from './useDecisions';
export { useOrigin, coarse } from './useOrigin';
export type { Origin, OriginState, OriginStatus, City } from './useOrigin';
export { LocationGate } from './LocationGate';
export { SettingsSheet, CoachOverlay, useCoach } from './SettingsSheet';
export {
  installFeedRouting, shouldRouteToFeed, getSurface, setSurface, isCrawler,
} from './routing';
export type { Surface, RoutingOptions } from './routing';
export type { Decisions } from './useDecisions';
export { keys as storageKeys, isEphemeral } from './storage';
export type {
  FeedItem, PersonItem, PostItem, MediaItem, FeedPage,
  FeedConfig, FeedTheme, ProductId, DistanceBand, Category,
} from './types';

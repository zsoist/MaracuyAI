import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type HomeTabParamList = {
  Home: undefined;
  Record: undefined;
  History: undefined;
  Settings: undefined;
  Guide: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<HomeTabParamList>;
  ParakeetProfile: { parakeetId: string };
  AddParakeet: undefined;
  Auth: undefined;
};

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type RecordScreenProps = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, 'Record'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type HistoryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, 'History'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type AddParakeetScreenProps = NativeStackScreenProps<RootStackParamList, 'AddParakeet'>;
export type AuthScreenProps = NativeStackScreenProps<RootStackParamList, 'Auth'>;
export type ParakeetProfileScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ParakeetProfile'
>;

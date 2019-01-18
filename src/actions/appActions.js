// @flow
import { NavigationActions } from 'react-navigation';
import { Sentry } from 'react-native-sentry';
import Storage from 'services/storage';
import { navigate } from 'services/navigation';
import { AUTH_FLOW, ONBOARDING_FLOW } from 'constants/navigationConstants';
import { UPDATE_APP_SETTINGS } from 'constants/appSettingsConstants';
import { UPDATE_ASSETS, UPDATE_BALANCES } from 'constants/assetsConstants';
import { UPDATE_CONTACTS } from 'constants/contactsConstants';
import { UPDATE_INVITATIONS } from 'constants/invitationsConstants';
import { UPDATE_ACCESS_TOKENS } from 'constants/accessTokensConstants';
import { UPDATE_SESSION } from 'constants/sessionConstants';
import { ADD_NOTIFICATION } from 'constants/notificationConstants';
import { SET_HISTORY } from 'constants/historyConstants';
import { UPDATE_WALLET_IMPORT_STATE } from 'constants/walletConstants';
import { UPDATE_OAUTH_TOKENS } from 'constants/oAuthConstants';
import { UPDATE_TX_COUNT } from 'constants/txCountConstants';
import { UPDATE_COLLECTIBLES } from 'constants/collectiblesConstants';
import { saveDbAction } from './dbActions';

const storage = Storage.getInstance('db');

const BACKGROUND = 'background';
const ANDROID = 'android';

export const initAppAndRedirectAction = (appState: string, platform: string) => {
  return async (dispatch: Function) => {
    // Appears that android back-handler on exit causes the app to mount once again.
    if (appState === BACKGROUND && platform === ANDROID) return;
    const { appSettings = {} } = await storage.get('app_settings');
    const { wallet } = await storage.get('wallet');

    if (appSettings.wallet) {
      const { assets = {} } = await storage.get('assets');
      dispatch({ type: UPDATE_ASSETS, payload: assets });

      const { balances = {} } = await storage.get('balances');
      dispatch({ type: UPDATE_BALANCES, payload: balances });

      const { contacts = [] } = await storage.get('contacts');
      dispatch({ type: UPDATE_CONTACTS, payload: contacts });

      const { invitations = [] } = await storage.get('invitations');
      dispatch({ type: UPDATE_INVITATIONS, payload: invitations });

      const { accessTokens = [] } = await storage.get('accessTokens');
      dispatch({ type: UPDATE_ACCESS_TOKENS, payload: accessTokens });

      const { oAuthTokens = {} } = await storage.get('oAuthTokens');
      dispatch({ type: UPDATE_OAUTH_TOKENS, payload: oAuthTokens });

      const { txCount = {} } = await storage.get('txCount');
      dispatch({ type: UPDATE_TX_COUNT, payload: txCount });

      const { collectibles = {} } = await storage.get('collectibles');
      dispatch({ type: UPDATE_COLLECTIBLES, payload: collectibles });

      const { history = [] } = await storage.get('history');
      // TEMP FIX, REMOVE LATER
      const filteredHistory = history
        .filter(({ hash }) => !!hash)
        .filter(({ value }) => typeof value !== 'object');
      if (filteredHistory.length !== history.length) {
        dispatch(saveDbAction('history', { history: filteredHistory }, true));
      }
      dispatch({ type: SET_HISTORY, payload: filteredHistory });

      dispatch({ type: UPDATE_APP_SETTINGS, payload: appSettings });

      if (wallet.backupStatus) dispatch({ type: UPDATE_WALLET_IMPORT_STATE, payload: wallet.backupStatus });

      navigate(NavigationActions.navigate({ routeName: AUTH_FLOW }));
      return;
    }
    dispatch({ type: UPDATE_APP_SETTINGS, payload: appSettings });
    navigate(NavigationActions.navigate({ routeName: ONBOARDING_FLOW }));
  };
};

export const setupSentryAction = (user: Object, wallet: Object) => {
  return async () => {
    const { id, username, walletId = '' } = user;
    const { address } = wallet;
    Sentry.setUserContext({
      userID: id,
      username,
      extra: {
        walletId,
        ethAddress: address,
      },
    });
  };
};

export const repairStorageAction = () => {
  return async (dispatch: Function) => {
    await storage.repair();
    dispatch({
      type: ADD_NOTIFICATION,
      payload: {
        message: 'Local storage repaired',
      },
    });
    dispatch({
      type: UPDATE_SESSION,
      payload: { hasDBConflicts: false },
    });
  };
};

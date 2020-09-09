// @flow
/*
    Pillar Wallet: the personal data locker
    Copyright (C) 2019 Stiftung Pillar Project

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

import RNFetchBlob from 'rn-fetch-blob';

import type { Dispatch, GetState } from 'reducers/rootReducer';
import type { CacheMap } from 'reducers/cacheReducer';
import { CACHE_STATUS } from 'constants/cacheConstants';
import { saveDbAction } from './dbActions';

// TODO: should prevent status === CACHE_STATUS.DONE ?
const canStartCaching = (urlAsKey: string, cacheMap: CacheMap) => {
  const { status } = cacheMap[urlAsKey] || {};
  return !status // haven't yet cached it
    || status !== CACHE_STATUS.PENDING // not being cached
    || status === CACHE_STATUS.FAILED; // allow to retry if failed
};

const finishCachingAction = (url: string, path: string) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    const { cache: { cacheMap } } = getState();

    dispatch({
      type: CACHE_STATUS.DONE,
      payload: {
        url,
        localUrl: path,
      },
    });

    const updatedCacheMap = {
      ...cacheMap,
      [url]: {
        status: CACHE_STATUS.DONE,
        localUrl: path,
      },
    };
    await dispatch(saveDbAction('cacheMap', { cacheMap: updatedCacheMap }, true));
  };
};

// TODO: call on registration to store cache from onboarding!
export const cacheUrlAction = (url: string) => {
  return async (dispatch: Dispatch, getState: GetState) => {
    const { cache: { cacheMap } } = getState();
    if (canStartCaching(url, cacheMap)) {
      dispatch({ type: CACHE_STATUS.PENDING, payload: { url } });
      await RNFetchBlob
        .config({
          fileCache: true,
          appendExt: 'json',
        })
        .fetch('GET', url)
        .then((res) => {
          if (res?.respInfo?.status === 200) {
            dispatch(finishCachingAction(url, res.path()));
          } else {
            dispatch({ type: CACHE_STATUS.FAILED, payload: { url } });
          }
        })
        .catch(() => {
          dispatch({ type: CACHE_STATUS.FAILED, payload: { url } });
        });
    }
  };
};

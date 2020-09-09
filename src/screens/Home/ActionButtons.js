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

import React from 'react';
import { Platform } from 'react-native';
import { connect } from 'react-redux';
import { withNavigation } from 'react-navigation';
import isEmpty from 'lodash.isempty';
import { createStructuredSelector } from 'reselect';
import t from 'translations/translate';

// components
import styled from 'styled-components/native';
import CircleButton from 'components/CircleButton';
import ReceiveModal, { ReceiveModalCenterFloatingItem } from 'screens/Asset/ReceiveModal';
import ActionOptionsModal from 'components/ActionModal/ActionOptionsModal';
import ModalInstance from 'components/Modals/ModalInstance/ModalInstance';

// constants
import { defaultFiatCurrency } from 'constants/assetsConstants';
import { SEND_TOKEN_FROM_HOME_FLOW, EXCHANGE, SERVICES } from 'constants/navigationConstants';

// actions
import { goToInvitationFlowAction } from 'actions/referralsActions';

// selectors
import { activeAccountAddressSelector } from 'selectors';
import { accountBalancesSelector } from 'selectors/balances';

// utils
import { calculateBalanceInFiat } from 'utils/assets';
import { getSmartWalletStatus } from 'utils/smartWallet';

// models, types
import type { RootReducerState, Dispatch } from 'reducers/rootReducer';
import type { Balances, Rates } from 'models/Asset';
import type { NavigationScreenProp } from 'react-navigation';
import type { SmartWalletStatus } from 'models/SmartWalletStatus';
import type { Accounts } from 'models/Account';
import type { SmartWalletReducerState } from 'reducers/smartWalletReducer';


type Props = {
  navigation: NavigationScreenProp<*>,
  baseFiatCurrency: ?string,
  activeAccountAddress: string,
  activeAccountBalances: Balances,
  goToInvitationFlow: () => void,
  rewardActive?: boolean,
  rates: Rates,
  accounts: Accounts,
  smartWalletState: SmartWalletReducerState,
};

const Sizer = styled.View`
  max-width: 350px;
  align-items: center;
  align-self: center;
`;

const ActionButtonsWrapper = styled.View`
  width: 100%;
  padding: 14px 10px 36px;
  flex-direction: row;
  justify-content: space-between;
`;

const ActionButtons = ({
  navigation,
  activeAccountAddress,
  activeAccountBalances,
  baseFiatCurrency,
  rewardActive,
  goToInvitationFlow,
  rates,
  accounts,
  smartWalletState,
}: Props) => {
  const fiatCurrency = baseFiatCurrency || defaultFiatCurrency;

  const addFundsModalOptions = [
    {
      key: 'buy',
      label: Platform.OS === 'ios' ? t('button.buyWithCardOrApplePay') : t('button.buyWithCard'),
      iconName: 'wallet',
      onPress: () => {
        ModalInstance.close();
        navigation.navigate(SERVICES, { fromAssetCode: fiatCurrency });
      },
    },
    {
      key: 'receive',
      label: t('button.sendFromAnotherWallet'),
      iconName: 'qrDetailed',
      onPress: () => {
        ModalInstance.show({
          noPadding: true,
          noClose: true,
          centerFloatingItem: (<ReceiveModalCenterFloatingItem />),
          children: (
            <ReceiveModal
              address={activeAccountAddress}
            />
          ),
        });
      },
    },
    {
      key: 'exchange',
      label: t('button.exchange'),
      iconName: 'flip',
      onPress: () => {
        ModalInstance.close();
        navigation.navigate(EXCHANGE);
      },
    },
    {
      key: 'invite',
      label: t('button.inviteAndGetTokens'),
      iconName: 'present',
      hide: !rewardActive,
      onPress: () => {
        ModalInstance.close();
        return goToInvitationFlow;
      },
    },
  ];

  const showAddFundsModal = () => {
    ModalInstance.show({
      noClose: true,
      hideHeader: true,
      children:
        (
          <ActionOptionsModal
            items={addFundsModalOptions}
            title={t('title.addFundsToWallet')}
          />
        ),
    });
  };

  const smartWalletStatus: SmartWalletStatus = getSmartWalletStatus(accounts, smartWalletState);
  const isSendButtonActive = calculateBalanceInFiat(rates, activeAccountBalances, fiatCurrency)
    && isEmpty(smartWalletStatus?.sendingBlockedMessage);

  return (
    <React.Fragment>
      <Sizer>
        <ActionButtonsWrapper>
          <CircleButton
            label={t('button.addFunds')}
            fontIcon="qrDetailed"
            onPress={() => showAddFundsModal()}
          />
          <CircleButton
            label={t('button.send')}
            fontIcon="paperPlane"
            onPress={() => navigation.navigate(SEND_TOKEN_FROM_HOME_FLOW)}
            disabled={!isSendButtonActive}
          />
          <CircleButton
            label={t('button.exchange')}
            fontIcon="exchange"
            onPress={() => navigation.navigate(EXCHANGE)}
          />
        </ActionButtonsWrapper>
      </Sizer>
    </React.Fragment>
  );
};

const mapStateToProps = ({
  appSettings: { data: { baseFiatCurrency } },
  rates: { data: rates },
  accounts: { data: accounts },
  smartWallet: smartWalletState,
}: RootReducerState): $Shape<Props> => ({
  baseFiatCurrency,
  rates,
  accounts,
  smartWalletState,
});

const structuredSelector = createStructuredSelector({
  activeAccountAddress: activeAccountAddressSelector,
  activeAccountBalances: accountBalancesSelector,
});

const combinedMapStateToProps = (state: RootReducerState): $Shape<Props> => ({
  ...structuredSelector(state),
  ...mapStateToProps(state),
});

const mapDispatchToProps = (dispatch: Dispatch): $Shape<Props> => ({
  goToInvitationFlow: () => dispatch(goToInvitationFlowAction()),
});

export default withNavigation(connect(combinedMapStateToProps, mapDispatchToProps)(ActionButtons));

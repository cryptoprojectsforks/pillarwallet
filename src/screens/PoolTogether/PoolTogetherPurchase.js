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

import * as React from 'react';
import { RefreshControl, Platform } from 'react-native';
import { connect } from 'react-redux';
import styled from 'styled-components/native';
import { createStructuredSelector } from 'reselect';
import type { NavigationScreenProp } from 'react-navigation';
import get from 'lodash.get';
import isEmpty from 'lodash.isempty';
import { utils } from 'ethers';
import t from 'translations/translate';

// actions
import { logScreenViewAction } from 'actions/analyticsActions';
import {
  fetchPoolPrizeInfo,
  setDismissApproveAction,
  fetchPoolAllowanceStatusAction,
} from 'actions/poolTogetherActions';

// constants
import { DAI, defaultFiatCurrency, ETH } from 'constants/assetsConstants';
import { SEND_TOKEN_PIN_CONFIRM, POOLTOGETHER_PURCHASE_CONFIRM } from 'constants/navigationConstants';
import { POOL_TOGETHER_ALLOW } from 'constants/poolTogetherConstants';

// components
import { ScrollWrapper } from 'components/Layout';
import ContainerWithHeader from 'components/Layout/ContainerWithHeader';
import { ValueSelectorCard } from 'components/ValueSelectorCard';
import { BaseText } from 'components/Typography';
import Button from 'components/Button';

// models
import type { Accounts } from 'models/Account';
import type { Balances, Rates, Assets, Asset } from 'models/Asset';
import type { PoolPrizeInfo } from 'models/PoolTogether';
import type { Dispatch, RootReducerState } from 'reducers/rootReducer';

// selectors
import { accountHistorySelector } from 'selectors/history';
import { accountBalancesSelector } from 'selectors/balances';
import { useGasTokenSelector } from 'selectors/smartWallet';
import { accountAssetsSelector } from 'selectors/assets';

// utils
import { themedColors } from 'utils/themes';
import { fontStyles } from 'utils/variables';
import { formatAmount, formatFiat, formatTransactionFee } from 'utils/common';
import { getWinChance } from 'utils/poolTogether';
import { getRate, isEnoughBalanceForTransactionFee, getAssetData, getAssetsAsList } from 'utils/assets';

// services
import {
  getApproveFeeAndTransaction,
  getPurchaseTicketFeeAndTransaction,
} from 'services/poolTogether';

// local components
import PoolTokenAllowModal from './PoolTokenAllowModal';


const ContentWrapper = styled.View`
  padding-top: ${Platform.select({
    ios: '25px',
    android: '19px',
  })};
`;

const Text = styled(BaseText)`
  ${({ label }) => label ? fontStyles.regular : fontStyles.large};
  letter-spacing: 0.18px;
  color: ${({ label }) => label ? themedColors.secondaryText : themedColors.text};
`;

const ContentRow = styled.View`
  flex-direction: row;
  justify-content: center;
  padding: 8px 20px 8px 20px;
`;

type Props = {
  name: string,
  navigation: NavigationScreenProp<*>,
  session: Object,
  smartWallet: Object,
  accounts: Accounts,
  balances: Balances,
  poolPrizeInfo: PoolPrizeInfo,
  logScreenView: (view: string, screen: string) => void,
  fetchPoolStats: (symbol: string) => void,
  fetchPoolAllowanceStatus: (symbol: string) => void,
  setDismissApprove: (symbol: string) => void,
  useGasToken: boolean,
  baseFiatCurrency: ?string,
  poolAllowance: { [string]: boolean },
  poolApproveExecuting: { [string]: boolean | string },
  rates: Rates,
  assets: Assets,
  supportedAssets: Asset[],
};

type State = {
  poolToken: string,
  tokenValue: number,
  userTickets: number,
  totalPoolTicketsCount: number,
  isAllowModalVisible: boolean,
  allowPayload: Object,
  gasToken: Object,
  txFeeInWei: number,
  purchasePayload: Object,
};

class PoolTogetherPurchase extends React.Component<Props, State> {
  scroll: Object;

  constructor(props) {
    const { navigation } = props;
    const {
      poolToken = DAI,
      poolTicketsCount = 0,
      userTickets = 0,
      totalPoolTicketsCount = 0,
    } = navigation.state.params || {};
    super(props);
    this.state = {
      poolToken,
      tokenValue: poolTicketsCount,
      userTickets,
      totalPoolTicketsCount,
      isAllowModalVisible: false,
      allowPayload: null,
      gasToken: null,
      txFeeInWei: 0,
      purchasePayload: null,
    };
  }

  componentDidMount() {
    const { logScreenView } = this.props;
    // check if poolTogether is already allowed and get fee if not
    this.updateFeeAndCheckAllowance();
    this.updatePurchaseFeeAndTransaction();
    logScreenView('View PoolTogether Purchase', 'PoolTogetherPurchase');
  }

  updateFeeAndCheckAllowance = async () => {
    const { poolToken } = this.state;
    const { useGasToken, poolAllowance } = this.props;
    const hasAllowance = poolAllowance[poolToken];
    if (!hasAllowance) {
      const {
        txFeeInWei,
        gasToken,
        transactionPayload,
      } = await getApproveFeeAndTransaction(poolToken, useGasToken) || {};
      if (txFeeInWei) {
        this.setState({
          gasToken,
          allowPayload: transactionPayload,
          txFeeInWei,
        });
      }
    }
  }

  updatePurchaseFeeAndTransaction = () => {
    const { poolToken, tokenValue } = this.state;
    const {
      useGasToken,
      poolAllowance,
      baseFiatCurrency,
      balances,
      rates,
    } = this.props;
    if (poolAllowance[poolToken]) {
      this.setState({
        purchasePayload: null,
      }, async () => {
        const {
          txFeeInWei,
          gasToken,
          transactionPayload,
        } = await getPurchaseTicketFeeAndTransaction(tokenValue, poolToken, useGasToken) || {};
        if (txFeeInWei) {
          const fiatCurrency = baseFiatCurrency || defaultFiatCurrency;
          const feeSymbol = get(gasToken, 'symbol', ETH);
          const feeDecimals = get(gasToken, 'decimals', 'ether');
          const feeNumeric = utils.formatUnits(txFeeInWei.toString(), feeDecimals);
          const feeInFiat = formatFiat(parseFloat(feeNumeric) * getRate(rates, feeSymbol, fiatCurrency), fiatCurrency);
          const feeDisplayValue = formatTransactionFee(txFeeInWei, gasToken);
          const isDisabled = !isEnoughBalanceForTransactionFee(balances, transactionPayload);
          const purchasePayload = {
            transactionPayload,
            feeInFiat,
            feeSymbol,
            feeDisplayValue,
            isDisabled,
          };
          this.setState({ purchasePayload });
        }
      });
    }
  }

  getFormValue = (value) => {
    const { input = '0' } = value || {};
    const newValue = Math.floor(parseFloat(input));
    this.setState({
      tokenValue: newValue,
    }, () => {
      if (newValue > 0) {
        this.updatePurchaseFeeAndTransaction();
      }
    });
  }

  hideAllowAssetModal = () => {
    const { setDismissApprove } = this.props;
    const { poolToken } = this.state;
    setDismissApprove(poolToken);
    this.setState({ isAllowModalVisible: false });
  };

  allowPoolAsset = () => {
    const { navigation } = this.props;
    const { allowPayload } = this.state;
    this.hideAllowAssetModal();
    navigation.navigate(SEND_TOKEN_PIN_CONFIRM, {
      transactionPayload: allowPayload,
      goBackDismiss: true,
      transactionType: POOL_TOGETHER_ALLOW,
    });
  };

  render() {
    const {
      navigation,
      fetchPoolStats,
      balances,
      baseFiatCurrency,
      rates,
      poolAllowance,
      poolApproveExecuting,
      fetchPoolAllowanceStatus,
      assets,
      supportedAssets,
    } = this.props;

    const {
      poolToken,
      tokenValue,
      userTickets,
      totalPoolTicketsCount,
      isAllowModalVisible,
      gasToken,
      txFeeInWei,
      allowPayload,
      purchasePayload,
    } = this.state;

    const hasAllowance = poolAllowance[poolToken];

    const winChance = getWinChance(tokenValue + userTickets, totalPoolTicketsCount);

    const isApprovalExecuting = !!poolApproveExecuting[poolToken];

    const isLoading = (!allowPayload && !hasAllowance) || (!purchasePayload && hasAllowance) || isApprovalExecuting;

    const purchaseDisabled = hasAllowance && (tokenValue === 0 || (purchasePayload && purchasePayload.isDisabled));

    let allowData;
    if (allowPayload) {
      const fiatCurrency = baseFiatCurrency || defaultFiatCurrency;
      const feeSymbol = get(gasToken, 'symbol', ETH);
      const feeDecimals = get(gasToken, 'decimals', 'ether');
      const feeNumeric = utils.formatUnits(txFeeInWei.toString(), feeDecimals);
      const feeInFiat = formatFiat(parseFloat(feeNumeric) * getRate(rates, feeSymbol, fiatCurrency), fiatCurrency);
      const feeDisplayValue = formatTransactionFee(txFeeInWei, gasToken);
      const isDisabled = !isEnoughBalanceForTransactionFee(balances, allowPayload);

      allowData = {
        assetSymbol: poolToken,
        feeDisplayValue,
        feeInFiat,
        isDisabled,
        feeToken: feeSymbol,
      };
    }

    let nextNavigationFunction;
    if (purchasePayload) {
      nextNavigationFunction = () => {
        navigation.navigate(POOLTOGETHER_PURCHASE_CONFIRM,
          {
            poolToken,
            tokenValue,
            totalPoolTicketsCount,
            userTickets,
            ...purchasePayload,
          });
      };
    }

    const poolTokenItem = getAssetData(getAssetsAsList(assets), supportedAssets, poolToken);
    const assetOptions = !isEmpty(poolTokenItem) ? [poolTokenItem] : [];

    return (
      <ContainerWithHeader
        inset={{ bottom: 'never' }}
        headerProps={{ centerItems: [{ title: t('poolTogetherContent.title.ticketPurchaseScreen') }] }}
      >
        <ScrollWrapper
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                fetchPoolStats(poolToken);
                if (isApprovalExecuting) {
                  fetchPoolAllowanceStatus(poolToken);
                }
              }}
            />
          }
          innerRef={ref => { this.scroll = ref; }}
          keyboardShouldPersistTaps="always"
        >
          <ContentWrapper>
            <ContentRow style={{ paddingLeft: 4, paddingRight: 4 }}>
              <ValueSelectorCard
                preselectedAsset={poolToken}
                getFormValue={this.getFormValue}
                maxLabel={t('button.spendMax')}
                customOptions={assetOptions}
                balances={balances}
                baseFiatCurrency={baseFiatCurrency}
                rates={rates}
                txFeeInfo={null}
                preselectedValue={tokenValue}
              />
            </ContentRow>
            <ContentRow>
              <Text label>
                {t('poolTogetherContent.label.winningChance', {
                  primaryText: t('percentValue', { value: formatAmount(winChance, 6) }),
                })}
              </Text>
            </ContentRow>
            <ContentRow>
              {(!hasAllowance && !isApprovalExecuting) &&
                <Text center label>{t('poolTogetherContent.paragraph.automationMissing')}</Text>
              }
              {!!isApprovalExecuting &&
                <Text center label>{t('poolTogetherContent.paragraph.pendingAutomation')}</Text>
              }
              {(!!hasAllowance && !purchasePayload) && <Text center label>{t('label.fetchingFee')}</Text>}
              {(!!hasAllowance && !!purchasePayload) &&
                <Text center label>
                  {t('label.feeTokenFiat', {
                    tokenValue: purchasePayload.feeDisplayValue,
                    fiatValue: purchasePayload.feeInFiat,
                  })}
                  {purchasePayload.isDisabled &&
                  // eslint-disable-next-line i18next/no-literal-string
                  `\n${t('error.notEnoughTokenForFee', { token: purchasePayload.feeSymbol })}`
                  }
                </Text>
              }
            </ContentRow>
            <ContentRow>
              {!purchaseDisabled &&
                <Button
                  title={t('button.next')}
                  onPress={() => {
                    if (!hasAllowance && !isApprovalExecuting) {
                      this.setState({ isAllowModalVisible: true });
                    }
                    return nextNavigationFunction && nextNavigationFunction();
                  }}
                  isLoading={isLoading}
                  disabled={purchaseDisabled}
                  style={{ marginBottom: 13, width: '100%' }}
                />
              }
              {!!purchaseDisabled && // has to update like this so it shows the disabled style
                <Button
                  title={t('button.next')}
                  disabled={purchaseDisabled}
                  style={{ marginBottom: 13, width: '100%' }}
                />
              }
            </ContentRow>
          </ContentWrapper>
        </ScrollWrapper>
        <PoolTokenAllowModal
          isVisible={!!isAllowModalVisible}
          onModalHide={this.hideAllowAssetModal}
          onAllow={this.allowPoolAsset}
          allowData={allowData}
        />
      </ContainerWithHeader>
    );
  }
}

const mapStateToProps = ({
  appSettings: { data: { baseFiatCurrency } },
  session: { data: session },
  accounts: { data: accounts },
  poolTogether: {
    poolStats: poolPrizeInfo,
    poolAllowance,
    poolApproveExecuting,
  },
  rates: { data: rates },
  assets: { supportedAssets },
}: RootReducerState): $Shape<Props> => ({
  baseFiatCurrency,
  session,
  accounts,
  poolPrizeInfo,
  poolAllowance,
  poolApproveExecuting,
  rates,
  supportedAssets,
});

const structuredSelector = createStructuredSelector({
  history: accountHistorySelector,
  balances: accountBalancesSelector,
  useGasToken: useGasTokenSelector,
  assets: accountAssetsSelector,
});

const combinedMapStateToProps = (state: RootReducerState): $Shape<Props> => ({
  ...structuredSelector(state),
  ...mapStateToProps(state),
});

const mapDispatchToProps = (dispatch: Dispatch): $Shape<Props> => ({
  logScreenView: (view: string, screen: string) => dispatch(logScreenViewAction(view, screen)),
  fetchPoolStats: (symbol: string) => dispatch(fetchPoolPrizeInfo(symbol)),
  fetchPoolAllowanceStatus: (symbol: string) => dispatch(fetchPoolAllowanceStatusAction(symbol)),
  setDismissApprove: (symbol: string) => dispatch(setDismissApproveAction(symbol)),
});

export default connect(combinedMapStateToProps, mapDispatchToProps)(PoolTogetherPurchase);

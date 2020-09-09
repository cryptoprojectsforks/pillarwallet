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
import { connect } from 'react-redux';
import { View, Image, Dimensions, Share, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import styled from 'styled-components/native';
import t from 'translations/translate';

// components
import { BaseText } from 'components/Typography';
import Button from 'components/Button';
import WarningBanner from 'components/WarningBanner';
import QRCodeWithTheme from 'components/QRCode';
import Toast from 'components/Toast';
import ProfileImage from 'components/ProfileImage';

// utils
import { spacing, fontStyles } from 'utils/variables';
import { getEnsName, getAccountTypeByAddress } from 'utils/accounts';

// models and types
import type { Accounts } from 'models/Account';
import type { RootReducerState } from 'reducers/rootReducer';
import type { User } from 'models/User';

// constants
import { ACCOUNT_TYPES } from 'constants/accountsConstants';


const ContentWrapper = styled(SafeAreaView)`
  padding: 0 ${spacing.layoutSides}px 60px;
  align-items: center;
`;

type Props = {
  address: string,
  accounts: Accounts,
  onModalHide: () => void,
  isVisible: boolean,
  handleBuyTokens?: Function,
  onModalHidden?: Function,
  showBuyTokensButton?: boolean,
  showErc20Note?: boolean,
  user: User,
};

const QRCodeWrapper = styled.View`
  align-items: center;
  justify-content: center;
`;

const WalletAddress = styled(BaseText)`
  ${fontStyles.regular};
  margin: ${spacing.small}px 0;
`;

const IconsContainer = styled.View`
  flex-direction: row;
  margin: 0 ${spacing.layoutSides}px;
  justify-content: center;
`;

const IconsSpacing = styled.View`
  width: ${spacing.small}px;
`;

const ButtonsRow = styled.View`
  flex-direction: row;
  margin-top: ${spacing.medium}px;
  margin-bottom: ${spacing.medium}px;
  justify-content: space-between;
  width: 100%;
`;

const InfoView = styled.View`
  margin-bottom: ${spacing.medium}px;
  justify-content: space-between;
  width: 100%;
`;

const ImageWrapper = styled.View`
  width: 100%;
  align-items: center;
  justify-content: center;
`;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getButtonWidth = () => {
  const marginBetweenButtons = SCREEN_WIDTH > 360 ? 12 : 4;
  return (SCREEN_WIDTH / 2) - spacing.layoutSides - (marginBetweenButtons / 2);
};

const visaIcon = require('assets/icons/visa.png');
const mastercardIcon = require('assets/icons/mastercard.png');

const ReceiveCenterFloatingItem = (props) => {
  const { user } = props;
  const { profileImage, lastUpdateTime = 0, username = '' } = user;
  const profileImageURI = profileImage ? `${profileImage}?t=${lastUpdateTime}` : null;
  return (
    <ImageWrapper style={{ position: 'absolute', marginTop: -24 }}>
      <ProfileImage
        uri={profileImageURI}
        userName={username}
        diameter={48}
        borderWidth={0}
        noShadow
      />
    </ImageWrapper>
  );
};

class ReceiveModal extends React.Component<Props, *> {
  handleAddressShare = () => {
    const { address } = this.props;

    Share.share({ title: t('title.publicAddress'), message: address });
  };

  handleCopyToClipboard = (address: string, ensCopy?: boolean) => {
    Clipboard.setString(address);
    const message = ensCopy ? t('toast.ensNameCopiedToClipboard') : t('toast.addressCopiedToClipboard');
    Toast.show({ message, emoji: 'ok_hand' });
  };

  render() {
    const {
      address,
      handleBuyTokens,
      showBuyTokensButton = false,
      accounts,
    } = this.props;

    const ensName = getEnsName(accounts);
    const isSmartWallet = getAccountTypeByAddress(address, accounts) === ACCOUNT_TYPES.SMART_WALLET;
    const buttonWidth = showBuyTokensButton ? getButtonWidth() : 0;
    const needsSmallButtons = showBuyTokensButton && buttonWidth <= 150;
    return (
      <ContentWrapper forceInset={{ top: 'never', bottom: 'always' }}>
        <WarningBanner rounded small />
        {!!ensName && !!isSmartWallet &&
          <InfoView>
            <BaseText
              big
              onPress={() => this.handleCopyToClipboard(ensName, true)}
              center
            >
              {ensName}
            </BaseText>
            <BaseText regular center secondary>{t('label.yourEnsName')}</BaseText>
          </InfoView>
          }
        <QRCodeWrapper>
          <View style={{ overflow: 'hidden', padding: 10 }}>
            {!!address && <QRCodeWithTheme value={address} size={160} />}
          </View>
          <WalletAddress onPress={() => this.handleCopyToClipboard(address)}>
            {address}
          </WalletAddress>
        </QRCodeWrapper>
        <ButtonsRow>
          {showBuyTokensButton && (
            <Button
              title={t('button.buyTokens')}
              onPress={handleBuyTokens}
              positive
              width={buttonWidth}
              small={needsSmallButtons}
              regularText
              textStyle={{ paddingTop: 4 }}
            />
            )}
          <Button
            title={t('button.shareAddress')}
            onPress={this.handleAddressShare}
            width={buttonWidth}
            small={needsSmallButtons}
            block={!buttonWidth}
            regularText
            textStyle={{ paddingTop: 4 }}
          />
        </ButtonsRow>
        {showBuyTokensButton && (
          <IconsContainer>
            <Image source={visaIcon} />
            <IconsSpacing />
            <Image source={mastercardIcon} />
          </IconsContainer>
          )}
      </ContentWrapper>
    );
  }
}

const mapStateToProps = ({
  user: { data: user },
  accounts: { data: accounts },
}: RootReducerState): $Shape<Props> => ({
  user,
  accounts,
});

export default connect(mapStateToProps)(ReceiveModal);

export const ReceiveModalCenterFloatingItem = connect(mapStateToProps)(ReceiveCenterFloatingItem);

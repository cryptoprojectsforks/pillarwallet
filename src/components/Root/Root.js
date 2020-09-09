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
import { View } from 'react-native';
import { ActionSheet } from 'native-base';
import { withTheme } from 'styled-components';
import Toast from 'components/Toast';
import ModalInstance from 'components/Modals/ModalInstance/ModalInstance';
import type { Theme } from 'models/Theme';

type Props = {
  children: React.Node,
  theme: Theme,
}

const Root = (props: Props) => (
  <View {...props} style={{ flex: 1 }}>
    {props.children}
    <Toast
      ref={c => {
        if (c && !Toast.toastInstances.includes(c)) Toast.toastInstances.push(c);
      }}
    />
    <ModalInstance
      theme={props.theme}
      ref={c => {
        if (c && !ModalInstance.modalInstances.includes(c)) ModalInstance.modalInstances.push(c);
      }}
    />
    <ActionSheet
      ref={c => {
        if (c) ActionSheet.actionsheetInstance = c;
      }}
    />
  </View>
);

export default withTheme(Root);

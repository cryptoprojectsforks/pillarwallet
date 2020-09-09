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
import { BaseText } from 'components/Typography';
import { shallow } from 'enzyme';
import { defaultTheme } from 'utils/themes';
import NewModal from '../NewModal';

describe('New Modal', () => {
  it('should render NewModal with content with the instance', () => {
    const wrapper = shallow(<NewModal theme={defaultTheme} />);
    NewModal.modalInstances.push(wrapper.instance());
    const ChildContent = () => <BaseText>Test</BaseText>;
    NewModal.show({
      children: (<ChildContent />),
    });
    expect(wrapper.find(ChildContent)).toHaveLength(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { deleteMetadataStream } from '../../../api_integration/apis/endpoint/data_stream_helper';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint', 'header', 'endpointPageUtils']);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');

  // FLAKY: https://github.com/elastic/kibana/issues/63621
  describe.skip('endpoint list', function () {
    this.tags('ciGroup7');
    const sleep = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
    before(async () => {
      await esArchiver.load('endpoint/metadata/api_feature', { useCreate: true });
      await pageObjects.endpoint.navigateToEndpointList();
    });

    it('finds page title', async () => {
      const title = await testSubjects.getVisibleText('pageViewHeaderLeftTitle');
      expect(title).to.equal('Endpoints');
    });

    it('displays table data', async () => {
      const expectedData = [
        [
          'Hostname',
          'Host Status',
          'Policy',
          'Policy Status',
          'Alerts',
          'Operating System',
          'IP Address',
          'Version',
          'Last Active',
        ],
        [
          'cadmann-4.example.com',
          'Error',
          'Policy Name',
          'Policy Status',
          '0',
          'windows 10.0',
          '10.192.213.130, 10.70.28.129',
          '6.6.1',
          'Jan 24, 2020 @ 16:06:09.541',
        ],
        [
          'thurlow-9.example.com',
          'Error',
          'Policy Name',
          'Policy Status',
          '0',
          'windows 10.0',
          '10.46.229.234',
          '6.0.0',
          'Jan 24, 2020 @ 16:06:09.541',
        ],
        [
          'rezzani-7.example.com',
          'Error',
          'Policy Name',
          'Policy Status',
          '0',
          'windows 10.0',
          '10.101.149.26, 2606:a000:ffc0:39:11ef:37b9:3371:578c',
          '6.8.0',
          'Jan 24, 2020 @ 16:06:09.541',
        ],
      ];
      const tableData = await pageObjects.endpointPageUtils.tableData('hostListTable');
      expect(tableData).to.eql(expectedData);
    });

    it('does not show the details flyout initially', async () => {
      await testSubjects.missingOrFail('hostDetailsFlyout');
    });

    describe('when the hostname is clicked on,', () => {
      it('display the details flyout', async () => {
        await (await testSubjects.find('hostnameCellLink')).click();
        await testSubjects.existOrFail('hostDetailsUpperList');
        await testSubjects.existOrFail('hostDetailsLowerList');
      });

      it('updates the details flyout when a new hostname is selected from the list', async () => {
        // display flyout for the first host in the list
        await (await testSubjects.findAll('hostnameCellLink'))[0].click();
        await testSubjects.existOrFail('hostDetailsFlyoutTitle');
        const hostDetailTitle0 = await testSubjects.getVisibleText('hostDetailsFlyoutTitle');
        // select the 2nd host in the host list
        await (await testSubjects.findAll('hostnameCellLink'))[1].click();
        await pageObjects.endpoint.waitForVisibleTextToChange(
          'hostDetailsFlyoutTitle',
          hostDetailTitle0
        );
        const hostDetailTitle1 = await testSubjects.getVisibleText('hostDetailsFlyoutTitle');
        expect(hostDetailTitle1).to.not.eql(hostDetailTitle0);
      });

      it('has the same flyout info when the same hostname is selected', async () => {
        // display flyout for the first host in the list
        await (await testSubjects.findAll('hostnameCellLink'))[1].click();
        await testSubjects.existOrFail('hostDetailsFlyoutTitle');
        const hostDetailTitleInitial = await testSubjects.getVisibleText('hostDetailsFlyoutTitle');
        // select the same host in the host list
        await (await testSubjects.findAll('hostnameCellLink'))[1].click();
        await sleep(500); // give page time to refresh and verify it did not change
        const hostDetailTitleNew = await testSubjects.getVisibleText('hostDetailsFlyoutTitle');
        expect(hostDetailTitleNew).to.equal(hostDetailTitleInitial);
      });

      it('navigates to ingest fleet when the Reassign Policy link is clicked', async () => {
        await (await testSubjects.find('hostDetailsLinkToIngest')).click();
        await testSubjects.existOrFail('fleetAgentListTable');
      });
    });

    describe('when there is no data,', () => {
      before(async () => {
        // clear out the data and reload the page
        await deleteMetadataStream(getService);
        await pageObjects.endpoint.navigateToEndpointList();
      });
      after(async () => {
        // reload the data so the other tests continue to pass
        await esArchiver.load('endpoint/metadata/api_feature', { useCreate: true });
      });
      it('displays No items found when empty', async () => {
        // get the endpoint list table data and verify message
        const [, [noItemsFoundMessage]] = await pageObjects.endpointPageUtils.tableData(
          'hostListTable'
        );
        expect(noItemsFoundMessage).to.equal('No items found');
      });
    });

    describe('has a url with a host id', () => {
      before(async () => {
        await pageObjects.endpoint.navigateToEndpointList(
          'selected_host=fc0ff548-feba-41b6-8367-65e8790d0eaf'
        );
      });

      it('shows a flyout', async () => {
        await testSubjects.existOrFail('hostDetailsFlyout');
      });

      it('displays details row headers', async () => {
        const expectedData = [
          'OS',
          'Last Seen',
          'Alerts',
          'Policy',
          'Policy Status',
          'IP Address',
          'Hostname',
          'Sensor Version',
        ];
        const keys = await pageObjects.endpoint.hostFlyoutDescriptionKeys('hostDetailsFlyout');
        expect(keys).to.eql(expectedData);
      });

      it('displays details row descriptions', async () => {
        const values = await pageObjects.endpoint.hostFlyoutDescriptionValues('hostDetailsFlyout');

        expect(values).to.eql([
          'Windows 10',
          '',
          '0',
          'Default',
          'Unknown',
          '10.101.149.262606:a000:ffc0:39:11ef:37b9:3371:578c',
          'rezzani-7.example.com',
          '6.8.0',
        ]);
      });
    });
    after(async () => {
      await deleteMetadataStream(getService);
    });
  });
};

/*
 * Copyright 2017-2019 EPAM Systems, Inc. (https://www.epam.com/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.epam.pipeline.elasticsearchagent.service.impl;

import com.epam.pipeline.elasticsearchagent.model.PermissionsContainer;
import com.epam.pipeline.elasticsearchagent.utils.ESConstants;
import com.epam.pipeline.entity.datastorage.AbstractDataStorage;
import com.epam.pipeline.entity.datastorage.DataStorageFile;
import com.epam.pipeline.entity.datastorage.GSBucketStorage;
import com.epam.pipeline.entity.datastorage.TemporaryCredentials;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.StorageClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.Spy;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.Collections;
import java.util.List;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.internal.verification.VerificationModeFactory.times;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasEntry;

@RunWith(MockitoJUnitRunner.class)
public class GsBucketFileManagerTest {
    private final String indexName = "testIndex";
    @Spy
    private final GsBucketFileManager manager = new GsBucketFileManager();
    private final AbstractDataStorage dataStorage = new GSBucketStorage();
    private final TemporaryCredentials temporaryCredentials = new TemporaryCredentials();
    private final PermissionsContainer permissionsContainer = new PermissionsContainer();
    @Mock
    private IndexRequestContainer requestContainer;

    @Test
    public void shouldAddZeroFilesToRequestContainer() {
        final List<Blob> files = Collections.emptyList();
        verifyRequestContainerState(files, 0);
    }

    @Test
    public void shouldAddTwoFilesToRequestContainer() {
        final List<Blob> files = Arrays.asList(createBlob("1"), createBlob("2"));
        verifyRequestContainerState(files, 2);
    }

    @Test
    public void shouldNotAddHiddenFilesToRequestContainer() {
        final List<Blob> files = Arrays.asList(createBlob("1"), createHiddenBlob("2"));
        verifyRequestContainerState(files, 1);
    }

    private void verifyRequestContainerState(final List<Blob> files, final int numberOfInvocation) {
        setUpReturnValues(files);
        manager.listAndIndexFiles(indexName,
                dataStorage,
                temporaryCredentials,
                permissionsContainer,
                requestContainer);
        verifyNumberOfInsertions(numberOfInvocation);
        verifyBlobMapping(files, numberOfInvocation);
    }

    private void setUpReturnValues(final List<Blob> files) {
        Mockito.doReturn(files)
                .when(manager)
                .getAllBlobsFromStorage(dataStorage, temporaryCredentials);
    }

    private void verifyBlobMapping(final List<Blob> files, final int numberOfInvocation) {
        final ArgumentCaptor<DataStorageFile> captor = ArgumentCaptor.forClass(DataStorageFile.class);
        verify(manager, times(numberOfInvocation))
                .createIndexRequest(captor.capture(), any(), any(), any(), any());
        final List<DataStorageFile> capturedValues = captor.getAllValues();
        for (int i = 0; i < numberOfInvocation; i++) {
            Blob blob = files.get(i);
            DataStorageFile fileToBeVerified = capturedValues.get(i);
            assertEquals(blob.getName(), fileToBeVerified.getName());
            assertEquals(blob.getSize(), fileToBeVerified.getSize());
            assertThat(fileToBeVerified.getLabels(),
                    hasEntry(ESConstants.STORAGE_CLASS_LABEL, blob.getStorageClass().name()));
        }
    }

    private void verifyNumberOfInsertions(final int numberOfInvocation) {
        verify(requestContainer, times(numberOfInvocation)).add(any());
    }

    private Blob createBlob(final String name) {
        final Blob result = Mockito.mock(Blob.class);
        final Long fileSize = 100L;
        final StorageClass storageClass = StorageClass.REGIONAL;
        Mockito.doReturn(name).when(result).getName();
        Mockito.doReturn(fileSize).when(result).getSize();
        Mockito.doReturn(storageClass).when(result).getStorageClass();
        return result;
    }

    private Blob createHiddenBlob(final String name) {
        return createBlob(name + ESConstants.HIDDEN_FILE_NAME.toLowerCase());
    }
}

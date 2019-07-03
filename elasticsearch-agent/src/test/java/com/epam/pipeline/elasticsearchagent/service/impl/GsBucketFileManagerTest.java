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
import com.epam.pipeline.entity.datastorage.TemporaryCredentials;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.StorageClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.Spy;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.*;

import static org.mockito.internal.verification.VerificationModeFactory.times;

@RunWith(MockitoJUnitRunner.class)
public class GsBucketFileManagerTest {
    private final String indexName = "testIndex";
    @Spy
    private final GsBucketFileManager manager = new GsBucketFileManager();
    @Mock
    private AbstractDataStorage dataStorage;
    @Mock
    private TemporaryCredentials temporaryCredentials;
    @Mock
    private PermissionsContainer permissionsContainer;
    @Mock
    private IndexRequestContainer requestContainer;

    @Test
    public void shouldAddZeroFilesToRequestContainer() {
        final List<Blob> files = Collections.emptyList();
        verifyAddedRequestCount(files, 0);
    }

    @Test
    public void shouldAddTwoFilesToRequestContainer() {
        final List<Blob> files = Arrays.asList(createBlob("1"), createBlob("2"));
        verifyAddedRequestCount(files, 2);
    }

    @Test
    public void shouldNotAddHiddenFilesToRequestContainer() {
        final List<Blob> files = Arrays.asList(createBlob("1"), createHiddenBlob("2"));
        verifyAddedRequestCount(files, 1);
    }

    private void verifyAddedRequestCount(final List<Blob> files, final int numberOfInvocation) {
        Mockito.doReturn(files)
                .when(manager)
                .getAllBlobsFromStorage(dataStorage, temporaryCredentials);
        manager.listAndIndexFiles(indexName,
                dataStorage,
                temporaryCredentials,
                permissionsContainer,
                requestContainer);
        Mockito.verify(requestContainer, times(numberOfInvocation)).add(Mockito.any());
    }

    private Blob createBlob(final String name) {
        final Blob result = Mockito.mock(Blob.class);
        final Long fileSize = 100L;
        final StorageClass storageClass = StorageClass.REGIONAL;
        final Long updateTime = 1500000000000L;
        Mockito.doReturn(name).when(result).getName();
        Mockito.doReturn(fileSize).when(result).getSize();
        Mockito.doReturn(storageClass).when(result).getStorageClass();
        Mockito.doReturn(Collections.singletonMap("key", "value" + name)).when(result).getMetadata();
        Mockito.doReturn(updateTime).when(result).getUpdateTime();
        return result;
    }

    private Blob createHiddenBlob(final String name) {
        return createBlob(name + ESConstants.HIDDEN_FILE_NAME.toLowerCase());
    }

}

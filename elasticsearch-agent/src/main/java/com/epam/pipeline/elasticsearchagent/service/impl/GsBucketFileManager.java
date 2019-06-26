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
import com.epam.pipeline.elasticsearchagent.service.ObjectStorageFileManager;
import com.epam.pipeline.elasticsearchagent.service.impl.converter.storage.StorageFileMapper;
import com.epam.pipeline.elasticsearchagent.utils.ESConstants;
import com.epam.pipeline.entity.datastorage.AbstractDataStorage;
import com.epam.pipeline.entity.datastorage.DataStorageFile;
import com.epam.pipeline.entity.datastorage.TemporaryCredentials;
import com.epam.pipeline.entity.search.SearchDocumentType;
import com.google.api.services.storage.StorageScopes;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.elasticsearch.action.index.IndexRequest;

import java.text.ParseException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.Date;
import java.util.Optional;

import static com.epam.pipeline.elasticsearchagent.utils.ESConstants.DOC_MAPPING_TYPE;

@Slf4j
public class GsBucketFileManager implements ObjectStorageFileManager {
    private final StorageFileMapper fileMapper = new StorageFileMapper();

    @Override
    public void listAndIndexFiles(final String indexName,
                                  final AbstractDataStorage dataStorage,
                                  final TemporaryCredentials credentials,
                                  final PermissionsContainer permissionsContainer,
                                  final IndexRequestContainer requestContainer) {

        final Bucket bucket = getGoogleBucket(dataStorage, credentials);
        final Iterable<Blob> blobs = getAllBlobsFromBucket(bucket);
        blobs.forEach(file -> indexFile(requestContainer,
                file,
                dataStorage,
                credentials.getRegion(),
                permissionsContainer,
                indexName));
    }

    Iterable<Blob> getAllBlobsFromBucket(final Bucket bucket) {
        return bucket.list()
                .iterateAll();
    }

    Bucket getGoogleBucket(final AbstractDataStorage dataStorage,
                           final TemporaryCredentials credentials) {
        final Storage storage = getGoogleStorage(credentials);
        final String bucketName = dataStorage.getName();
        return storage.get(bucketName);
    }

    private Storage getGoogleStorage(final TemporaryCredentials credentials) {
        final GoogleCredentials googleCredentials = createGoogleCredentials(credentials);
        return StorageOptions
                .newBuilder()
                .setCredentials(googleCredentials)
                .build()
                .getService();
    }

    private GoogleCredentials createGoogleCredentials(final TemporaryCredentials credentials) {
        try {
            final Date expirationDate = ESConstants.FILE_DATE_FORMAT.parse(credentials.getExpirationTime());
            final AccessToken token = new AccessToken(credentials.getToken(), expirationDate);

            return GoogleCredentials
                    .create(token)
                    .createScoped(Collections.singletonList(StorageScopes.CLOUD_PLATFORM_READ_ONLY));
        } catch (ParseException e) {
            log.error(e.getMessage());
            throw new DateTimeParseException(e.getMessage(), credentials.getExpirationTime(), e.getErrorOffset());
        }
    }

    private void indexFile(final IndexRequestContainer indexContainer,
                           final Blob file,
                           final AbstractDataStorage storage,
                           final String region,
                           final PermissionsContainer permissions,
                           final String indexName) {
        Optional.ofNullable(convertToStorageFile(file))
                .ifPresent(
                    item -> indexContainer
                                .add(createIndexRequest(item,
                                        indexName,
                                        storage,
                                        region,
                                        permissions)));
    }

    private DataStorageFile convertToStorageFile(final Blob blob) {
        final String relativePath = blob.getName();
        if (StringUtils.endsWithIgnoreCase(relativePath, ESConstants.HIDDEN_FILE_NAME.toLowerCase())) {
            return null;
        }
        final DataStorageFile file = new DataStorageFile();
        file.setName(relativePath);
        file.setPath(relativePath);
        file.setSize(blob.getSize());
        file.setChanged(ESConstants.FILE_DATE_FORMAT.format(Date.from(Instant.ofEpochMilli(blob.getUpdateTime()))));
        file.setVersion(null);
        file.setDeleteMarker(null);
        file.setTags(MapUtils.emptyIfNull(blob.getMetadata()));
        Optional.ofNullable(blob.getStorageClass())
                .ifPresent(sc -> file.setLabels(Collections.singletonMap("StorageClass", sc.name())));
        return file;
    }

    private IndexRequest createIndexRequest(final DataStorageFile item,
                                            final String indexName,
                                            final AbstractDataStorage storage,
                                            final String region,
                                            final PermissionsContainer permissions) {
        return new IndexRequest(indexName, DOC_MAPPING_TYPE)
                .source(fileMapper.fileToDocument(item, storage, region, permissions,
                        SearchDocumentType.GS_FILE));
    }
}
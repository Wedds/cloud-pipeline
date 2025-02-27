# Cloud Pipeline v.0.16 - Release notes

- [Google Cloud Platform Support](#google-cloud-platform-support)
- [Displaying Cloud Provider's icon](#displaying-cloud-providers-icon-for-the-storagecompute-resources)
- [Configurable timeout of GE Autoscale waiting](#configurable-timeout-of-ge-autoscale-waiting-for-a-worker-node-up)
- [Storage mounts data transfer restrictor](#storage-mounts-data-transfer-restrictor)
- [Symlinks handling for `pipe storage cp/mv` operations](#extended-symlinks-handling-for-pipe-storage-cpmv-operations)

***

- [Notable Bug fixes](#notable-bug-fixes)
    - [Setting of the tool icon size](#setting-of-the-tool-icon-size)
    - [`NPE` while building cloud-specific environment variables for run](#npe-while-building-cloud-specific-environment-variables-for-run)
    - [Worker nodes fail due to mismatch of the regions with the parent run](#worker-nodes-fail-due-to-mismatch-of-the-regions-with-the-parent-run)
    - [Worker nodes shall not be restarted automatically](#worker-nodes-shall-not-be-restarted-automatically)
    - [Uploaded storage file content is downloaded back to client](#uploaded-storage-file-content-is-downloaded-back-to-client)
    - [GUI improperly works with detached configurations in a non-default region](#gui-improperly-works-with-detached-configurations-in-a-non-default-region)
    - [Detached configuration doesn't respect region setting](#detached-configuration-doesnt-respect-region-setting)
    - [Incorrect behavior of the "Transfer to the cloud" form in case when a subfolder has own metadata](#incorrect-behavior-of-the-transfer-to-the-cloud-form-in-case-when-a-subfolder-has-own-metadata)
    - [Incorrect displaying of the "Start idle" checkbox](#incorrect-displaying-of-the-start-idle-checkbox)
    - [Limit check of the maximum cluster size is incorrect](#limit-check-of-the-maximum-cluster-size-is-incorrect)
    - [Fixed cluster with SGE and DIND capabilities fails to start](#fixed-cluster-with-sge-and-dind-capabilities-fails-to-start)
    - [Azure: `pipe` CLI cannot transfer empty files between storages](#azure-pipe-cli-cannot-transfer-empty-files-between-storages)
    - [Azure: runs with enabled GE autoscaling doesn't stop](#azure-runs-with-enabled-ge-autoscaling-doesnt-stop)
    - [Incorrect behavior while download files from external resources into several folders](#incorrect-behavior-while-download-files-from-external-resources-into-several-folders)
    - [Detach configuration doesn't setup SGE for a single master run](#detach-configuration-doesnt-setup-sge-for-a-single-master-run)

***

## Google Cloud Platform Support

One of the major **`v0.16`** features is a support for the **[Google Cloud Platform](https://cloud.google.com/)**.

All the features, that were previously used for **`AWS`** and **`Azure`**, are now available in all the same manner, from all the same GUI/CLI, for **`GCP`**.

This provides an even greater level of a flexibility to launch different jobs in the locations, closer to the data, with cheaper prices or better compute hardware in depend on a specific task.

## Displaying Cloud Provider's icon for the storage/compute resources

As presented in **[v0.15](../v.0.15/v.0.15_-_Release_notes.md#microsoft-azure-support)**, Cloud Pipeline can manage multi Cloud Providers in a single installation.

In the current version, useful icon-hints with the information about using Cloud Provider are introduced.  
If a specific platform deployment has a number of Cloud Providers registered (e.g. `AWS`+`Azure`, `GCP`+`Azure`) - corresponding icons/text information are displaying next to the cloud resource.

Such cloud resources are:

- **`Object/File Storages`** (icons in the **Library**, at the "DATA" panel of the **Dashboard** etc.)  
    ![CP_v.0.16_ReleaseNotes](attachments/RN016_CloudProviderIcons_1.png)  
    ![CP_v.0.16_ReleaseNotes](attachments/RN016_CloudProviderIcons_3.png)
- **`Regions`** (icons in the **Cloud Regions** configuration, at the **Launch** form etc.)  
    ![CP_v.0.16_ReleaseNotes](attachments/RN016_CloudProviderIcons_2.png)  
    ![CP_v.0.16_ReleaseNotes](attachments/RN016_CloudProviderIcons_4.png)  
- **`Running jobs`**:
    - text hints (at the **RUNS** page)  
        ![CP_v.0.16_ReleaseNotes](attachments/RN016_CloudProviderIcons_7.png)
    - icons (at the **Run logs** page, at the "RUNS" panels of the **Dashboard**)  
        ![CP_v.0.16_ReleaseNotes](attachments/RN016_CloudProviderIcons_5.png)  
        ![CP_v.0.16_ReleaseNotes](attachments/RN016_CloudProviderIcons_6.png)

> **_Note_**: this feature is not available for deployments with a **_single_** Cloud Provider.

Examples of displaying Cloud Region icons/info see in sections [6. Manage Pipeline](../../manual/06_Manage_Pipeline/6._Manage_Pipeline.md), [7. Manage Detached configuration](../../manual/07_Manage_Detached_configuration/7._Manage_Detached_configuration.md), [8. Manage Data Storage](../../manual/08_Manage_Data_Storage/8._Manage_Data_Storage.md) and [18. Home page](../../manual/18_Home_page/18._Home_page.md).

## Configurable timeout of GE Autoscale waiting for a worker node up

Previously, `GE Autoscaler` waited for a worker node up for a fixed timeout. This could lead to incorrect behavior for specific **CLoud Providers**, because the timeout can be very different.

Current version extracts `GE Autoscaler` polling timeout to a new system preference **`ge.autoscaling.scale.up.polling.timeout`**.  
That preference defines how many seconds `GE Autoscaler` should wait for **pod initialization** and **run initialization**.  
Default value is `600` seconds (`10` minutes).

## Storage mounts data transfer restrictor

Users may perform `cp` or `mv` operations of the large files (50+ Gb) to and from the fuse-mounted storages.  
It is uncovered that such operations are not handled properly within the fuse implementations. Commands may hang for a long timeout or produce zero-sized result.  
The suggested more graceful approach for the copying of the large files is to use `pipe cp`/`pipe mv` commands, which are behaving correctly for the huge volumes.  
To avoid users of performing usual `cp` or `mv` commands for operations with the large files - now, **Cloud Pipeline** warns them about possible errors and suggest to use corresponding `pipe` commands.

Specified approach is implemented in the following manner:

- if a `cp`/`mv` command is called with the source/dest pointing to the storage (e.g. `/cloud-data/<storage_path>/...`) - the overall size of the data being transferred is checked - if that size is greater than allowed, a warning message will be shown, e.g.:  
    ![CP_v.0.16_ReleaseNotes](attachments/RN016_CopyingWarnings_1.png)
- this warning doesn't abort the user's command execution, it is continued
- appearance of this warning is configured by the following launch environment variables (values of these variables could be set only by admins via system-level settings):  
    - **`CP_ALLOWED_MOUNT_TRANSFER_SIZE`** - sets number of gigabytes that is allowed to be transferred without warning. By default _50 Gb_.
    - **`CP_ALLOWED_MOUNT_TRANSFER_SIZE_TIMEOUT`** - sets number of seconds that the transfer size retrieving operation can take. By default _5 seconds_.
    - **`CP_ALLOWED_MOUNT_TRANSFER_FILES`** - sets number of files that is allowed to be transferred without warning. Supported only for `Azure` Cloud Provider. By default _100 files_.

> **_Note_**: this feature is not available for `NFS`/`SMB` mounts, only for object storages.

## Extended symlinks handling for `pipe storage cp/mv` operations

In specific cases some services could execute tasks using the on-prem storages, where "recursive" symlinks could be presented. This may caused such services to follow symlinks infinitely.

To avoid of that behavior, in **`v0.16`** a new option was added to `pipe storage cp`/`pipe storage mv` operations to handle symlinks (for local source) → `--symlinks` (`-sl`) that supports three possible values:

- `follow` - to follow symlinks (default behavior)
- `skip` - do not follow symlinks
- `filter` - to follow symlinks but check for cyclic links (by keeping track of visited symlinks)

***

## Notable Bug fixes

### Setting of the tool icon size

[#493](https://github.com/epam/cloud-pipeline/issues/493)

Previously, setting of any value for the maximum tool's icon size via the sytem-level preference **`misc.max.tool.icon.size.kb`** didn't lead to anything - restriction for the size while trying to change an icon was remaining the same - 50 Kb.

### `NPE` while building cloud-specific environment variables for run

[#486](https://github.com/epam/cloud-pipeline/issues/486)

For each run a set of cloud-specific environment variables (including account names, credentials, etc.) is build. This functionality resulted to fails with `NPE` when some of these variables are `null`.
Now, such `null` variables are filtered out with warn logs.

### Worker nodes fail due to mismatch of the regions with the parent run

[#485](https://github.com/epam/cloud-pipeline/issues/485)

In certain cases, when a new child run was launching in cluster, cloud region was not specified directly and it might be created in a region differing from the parent run, that could lead to fails.  
Now, worker runs inherit parent's run cloud region.

### Worker nodes shall not be restarted automatically

[#483](https://github.com/epam/cloud-pipeline/issues/483)

Cloud Pipeline has a functionality to restart so called `batch job` runs automatically when run is terminated due to some technical issues, e.g. spot instance termination. Previously, runs that were created as **child nodes** for some **parent** run were also restarted.
Now, automatically **child** reruns for the described cases with the `batch job` runs are rejected.

### Uploaded storage file content is downloaded back to client

[#478](https://github.com/epam/cloud-pipeline/issues/478)

Cloud Pipeline clients use specific POST API method to upload local files to the cloud storages. Previously, this method not only uploaded files to the cloud storage but also mistakenly returned uploaded file content back to the client. It led to a significant upload time increase.

### GUI improperly works with detached configurations in a non-default region

[#476](https://github.com/epam/cloud-pipeline/issues/476)

Saved instance type of a non-default region in a detached configuration wasn't displayed in case when such configuration was reopened (instance type field was displayed as empty in that cases).

### Detached configuration doesn't respect region setting

[#458](https://github.com/epam/cloud-pipeline/issues/458)

Region setting was not applied when pipeline is launched using detached configuration.  
Now, cloud region ID is merged into the detached configuration settings.

### Incorrect behavior of the "Transfer to the cloud" form in case when a subfolder has own metadata

[#434](https://github.com/epam/cloud-pipeline/issues/434)

Previously, when you tried to download files from external resources using metadata (see [here](../../manual/05_Manage_Metadata/5.5._Download_data_from_external_resources_to_the_cloud_data_storage.md)) and in that metadata's folder there was any subfolder with its own metadata - on the "Transfer to the Cloud" form attributes (columns) of **both** metadata files were mistakenly displaying.

### Incorrect displaying of the "Start idle" checkbox

[#418](https://github.com/epam/cloud-pipeline/issues/418)

If for the configuration form with several tabs user was setting the **Start idle** checkbox on any tab and then switched between sub-configurations tabs - the "checked" state of the **Start idle** checkbox didn't change, even if **Cmd template** field was appearing with its value (these events are mutually exclusive).

### Limit check of the maximum cluster size is incorrect

[#412](https://github.com/epam/cloud-pipeline/issues/412)

Maximum allowed number of runs (size of the cluster) created at once is limited by system preference **`launch.max.scheduled.number`**. This check used strictly "less" check rather then "less or equal" to allow or deny cluster launch.  
Now, the "less or equal" check is used.

### Fixed cluster with SGE and DIND capabilities fails to start

[#392](https://github.com/epam/cloud-pipeline/issues/392)

Previously, fixed cluster with both **`CP_CAP_SGE`** and **`CP_CAP_DIND_CONTAINER`** options enabled with more than one worker failed to start. Some of the workers failed on either `SGEWorkerSetup` or `SetupDind` task with different errors. Scripts were executed in the same one shared analysis directory. So, some workers could delete files downloaded by other workers.

### Azure: `pipe` CLI cannot transfer empty files between storages

[#386](https://github.com/epam/cloud-pipeline/issues/386)

Previously, empty files couldn't be transferred within a single `Azure` storage or between two `Azure` storages using `pipe` CLI, it throwed an error. So for example, a folder that contained empty files couldn't be copied correctly.

### Azure: runs with enabled GE autoscaling doesn't stop

[#377](https://github.com/epam/cloud-pipeline/issues/377)

All `Azure` runs with enabled GE autoscaling were stuck after the `launch.sh` script has finished its execution. Daemon GE autoscaler process kept container alive. It was caused by the run process `stdout` and `stderr` aren't handled the same way for different Cloud Provider. So background processes launched from `launch.sh` directly could prevent `Azure` run finalization.

### Incorrect behavior while download files from external resources into several folders

[#373](https://github.com/epam/cloud-pipeline/issues/373)

If user was tried to download files from external resources and at the **Transfer settings** form was set **Create folders for each _path_ field** checkbox without setting any name field, all files downloaded into one folder without creating folders for each path field (column).

### Detach configuration doesn't setup SGE for a single master run

[#342](https://github.com/epam/cloud-pipeline/issues/342)

`Grid Engine` installation was mistakenly being skipped, if pipeline was launched with enabled system parameter **`CP_CAP_SGE`** via a detach configuration.

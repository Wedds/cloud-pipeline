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

import React from 'react';
import PropTypes from 'prop-types';
import {Checkbox, InputNumber, Icon, Modal, Radio, Row} from 'antd';
import {computed} from 'mobx';
import {inject, observer} from 'mobx-react';
import {
  LaunchClusterTooltip,
  renderTooltip
} from './launch-cluster-tooltips';

export const CP_CAP_SGE = 'CP_CAP_SGE';
export const CP_CAP_SPARK = 'CP_CAP_SPARK';
export const CP_CAP_AUTOSCALE = 'CP_CAP_AUTOSCALE';
export const CP_CAP_AUTOSCALE_WORKERS = 'CP_CAP_AUTOSCALE_WORKERS';

const PARAMETER_TITLE_WIDTH = 110;
const PARAMETER_TITLE_RIGHT_MARGIN = 5;
const LEFT_MARGIN = PARAMETER_TITLE_WIDTH + PARAMETER_TITLE_RIGHT_MARGIN;
const PARAMETER_TITLE_STYLE = {
  width: PARAMETER_TITLE_WIDTH,
  marginRight: PARAMETER_TITLE_RIGHT_MARGIN
};

function booleanParameterIsSetToValue (parameters, parameter, value = true) {
  return !!parameters &&
    parameters.hasOwnProperty(parameter) &&
    `${parameters[parameter].value}` === `${value}`;
}

export function autoScaledClusterEnabled (parameters) {
  return booleanParameterIsSetToValue(parameters, CP_CAP_SGE) &&
    booleanParameterIsSetToValue(parameters, CP_CAP_AUTOSCALE);
}

export function gridEngineEnabled (parameters) {
  return booleanParameterIsSetToValue(parameters, CP_CAP_SGE);
}

export function sparkEnabled (parameters) {
  return booleanParameterIsSetToValue(parameters, CP_CAP_SPARK);
}

export const CLUSTER_TYPE = {
  singleNode: 0,
  fixedCluster: 1,
  autoScaledCluster: 2
};

export function getSkippedSystemParametersList (controller) {
  if (controller && controller.state && controller.state.launchCluster &&
    (
      controller.state.autoScaledCluster ||
      controller.state.gridEngineEnabled ||
      controller.state.sparkEnabled
    )) {
    return [CP_CAP_SGE, CP_CAP_SPARK, CP_CAP_AUTOSCALE, CP_CAP_AUTOSCALE_WORKERS];
  }
  return [CP_CAP_AUTOSCALE, CP_CAP_AUTOSCALE_WORKERS];
}

export function getSystemParameterDisabledState (controller, parameterName) {
  return getSkippedSystemParametersList(controller).indexOf(parameterName) >= 0;
}

export function setClusterParameterValue (form, sectionName, configuration) {
  if (!form || !configuration) {
    return;
  }
  const {
    gridEngineEnabled,
    sparkEnabled
  } = configuration;
  const formValue = form.getFieldValue(sectionName);
  if (!formValue || !formValue.hasOwnProperty('params')) {
    return;
  }
  const {params} = formValue;
  const keys = Object.keys(params);
  let modified = false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = params[key];
    if (!value || !value.name) {
      continue;
    }
    if (value.name === CP_CAP_SGE) {
      value.value = `${gridEngineEnabled}`;
      modified = true;
    }
    if (value.name === CP_CAP_SPARK) {
      value.value = `${sparkEnabled}`;
      modified = true;
    }
  }
  if (modified) {
    form.setFieldsValue(
      {
        [sectionName]: formValue
      }
    );
  }
}

export function setSingleNodeMode (controller, callback) {
  controller.setState({
    launchCluster: false,
    autoScaledCluster: false,
    setDefaultNodesCount: false,
    gridEngineEnabled: false,
    sparkEnabled: false
  }, callback);
}

export function setFixedClusterMode (controller, callback) {
  controller.setState({
    launchCluster: true,
    autoScaledCluster: false,
    setDefaultNodesCount: false,
    gridEngineEnabled: false,
    sparkEnabled: false,
    nodesCount: Math.max(1,
      !isNaN(controller.state.maxNodesCount)
        ? controller.state.maxNodesCount
        : 1
    )
  }, callback);
}

export function setAutoScaledMode (controller, callback) {
  controller.setState({
    launchCluster: true,
    autoScaledCluster: true,
    setDefaultNodesCount: false,
    nodesCount: undefined,
    gridEngineEnabled: false,
    sparkEnabled: false,
    maxNodesCount: Math.max(1,
      !isNaN(controller.state.nodesCount)
        ? controller.state.nodesCount
        : 1
    )
  }, callback);
}

const range = ({nodesCount, maxNodesCount}) => {
  return `${nodesCount} - ${maxNodesCount}`;
};

const plural = (count, str) => {
  if (count === 1) {
    return `${count} ${str}`;
  }
  return `${count} ${str}s`;
};

const lowerCasedString = (string, lowercased) => {
  if (lowercased) {
    return (string || '').toLowerCase();
  }
  return string;
};

@inject('preferences')
@observer
class ConfigureClusterDialog extends React.Component {
  static getClusterName = (ctrl, lowerCased) => {
    if (ctrl.state.launchCluster && ctrl.state.autoScaledCluster) {
      const name = lowerCasedString('Auto-scaled cluster', lowerCased);
      if (!isNaN(ctrl.state.nodesCount) && !isNaN(ctrl.state.maxNodesCount)) {
        return `${name} (${range(ctrl.state)} child nodes)`;
      }
      return name;
    } else if (ctrl.state.launchCluster) {
      let clusterName = lowerCasedString('Cluster', lowerCased);
      if (ctrl.state.gridEngineEnabled) {
        clusterName = `GridEngine ${lowerCasedString('Cluster', lowerCased)}`;
      }
      if (ctrl.state.sparkEnabled) {
        clusterName = `Apache Spark ${lowerCasedString('Cluster', lowerCased)}`;
      }
      if (!isNaN(ctrl.state.nodesCount)) {
        return `${clusterName} (${plural(ctrl.state.nodesCount, 'child node')})`;
      }
      return clusterName;
    }
    return null;
  };

  static getClusterDescription = (ctrl, lowerCased = false) => {
    return ConfigureClusterDialog.getClusterName(ctrl, lowerCased) ||
      lowerCasedString('Single node', lowerCased);
  };

  static getConfigureClusterButtonDescription = (ctrl, lowerCased = false) => {
    return ConfigureClusterDialog.getClusterName(ctrl, lowerCased) ||
      lowerCasedString('Configure cluster', lowerCased);
  };

  static propTypes = {
    visible: PropTypes.bool,
    disabled: PropTypes.bool,
    launchCluster: PropTypes.bool,
    autoScaledCluster: PropTypes.bool,
    gridEngineEnabled: PropTypes.bool,
    sparkEnabled: PropTypes.bool,
    nodesCount: PropTypes.number,
    maxNodesCount: PropTypes.number,
    onChange: PropTypes.func,
    onClose: PropTypes.func,
    instanceName: PropTypes.string
  };

  state = {
    launchCluster: false,
    autoScaledCluster: false,
    setDefaultNodesCount: false,
    gridEngineEnabled: false,
    sparkEnabled: false,
    nodesCount: 0,
    maxNodesCount: 0,
    validation: {
      nodesCount: null,
      maxNodesCount: null
    }
  };

  @computed
  get selectedClusterType () {
    if (this.state.launchCluster) {
      return this.state.autoScaledCluster && !this.state.sparkEnabled
        ? CLUSTER_TYPE.autoScaledCluster
        : CLUSTER_TYPE.fixedCluster;
    } else {
      return CLUSTER_TYPE.singleNode;
    }
  }

  onChange = (e) => {
    if (this.props.disabled) {
      return;
    }
    switch (e.target.value) {
      case CLUSTER_TYPE.fixedCluster:
        setFixedClusterMode(this, this.validate);
        break;
      case CLUSTER_TYPE.autoScaledCluster:
        setAutoScaledMode(this, this.validate);
        break;
      case CLUSTER_TYPE.singleNode:
      default:
        setSingleNodeMode(this, this.validate);
        break;
    }
  };

  onChangeNodeCount = (value) => {
    this.setState({
      nodesCount: value
    }, this.validate);
  };

  onChangeMaxNodeCount = (value) => {
    this.setState({
      maxNodesCount: value
    }, this.validate);
  };

  getInputStyle = (field) => {
    if (this.state.validation[field]) {
      return {
        border: '1px solid red',
        outline: 'none'
      };
    }
    return {};
  };

  getValidationRow = (field) => {
    if (this.state.validation[field]) {
      return (
        <Row
          key={`${field} validation`}
          type="flex"
          align="middle"
          style={{paddingLeft: 115, fontSize: 'smaller', color: 'red'}}>
          {this.state.validation[field]}
        </Row>
      );
    }
    return null;
  };

  onChangeEnableGridEngine = (e) => {
    this.setState({
      gridEngineEnabled: e.target.checked,
      sparkEnabled: false
    });
  };

  onChangeEnableSpark = (e) => {
    this.setState({
      gridEngineEnabled: false,
      sparkEnabled: e.target.checked
    });
  };

  renderFixedClusterConfiguration = () => {
    return [
      <Row key="nodes count" type="flex" align="middle" style={{marginTop: 5}}>
        <span style={PARAMETER_TITLE_STYLE}>Child nodes:</span>
        <InputNumber
          min={1}
          max={this.launchMaxScheduledNumber}
          disabled={this.props.disabled}
          style={Object.assign({flex: 1}, this.getInputStyle('nodesCount'))}
          value={this.state.nodesCount}
          onChange={this.onChangeNodeCount} />
      </Row>,
      this.getValidationRow('nodesCount'),
      <Row key="enable grid engine" type="flex" align="middle" style={{marginTop: 5}}>
        <Checkbox
          style={{marginLeft: LEFT_MARGIN}}
          checked={this.state.gridEngineEnabled}
          onChange={this.onChangeEnableGridEngine}>
          Enable GridEngine
        </Checkbox>
        {renderTooltip(LaunchClusterTooltip.cluster.enableGridEngine)}
      </Row>,
      <Row key="enable spark" type="flex" align="middle" style={{marginTop: 5}}>
        <Checkbox
          style={{marginLeft: LEFT_MARGIN}}
          checked={this.state.sparkEnabled}
          onChange={this.onChangeEnableSpark}>
          Enable Apache Spark
        </Checkbox>
        {renderTooltip(LaunchClusterTooltip.cluster.enableSpark)}
      </Row>
    ].filter(r => !!r);
  };

  renderAutoScaledClusterConfiguration = () => {
    const onSetUpChildNodesClicked = () => {
      this.setState({
        setDefaultNodesCount: true,
        maxNodesCount: !isNaN(this.state.maxNodesCount)
          ? Math.max(2, this.state.maxNodesCount)
          : 2,
        nodesCount: !isNaN(this.state.nodesCount)
          ? Math.max(1, this.state.nodesCount)
          : 1
      });
    };
    const onUnsetChildNodes = () => {
      this.setState({
        setDefaultNodesCount: false
      }, this.validate);
    };
    const renderSetDefaultNodesCount = () => {
      if (this.state.setDefaultNodesCount) {
        return [
          <Row key="nodes count" type="flex" align="middle" style={{marginTop: 5}}>
            <span style={PARAMETER_TITLE_STYLE}>Default child nodes:</span>
            <InputNumber
              min={1}
              max={this.launchMaxScheduledNumber}
              disabled={this.props.disabled}
              style={Object.assign({flex: 1}, this.getInputStyle('nodesCount'))}
              value={this.state.nodesCount}
              onChange={this.onChangeNodeCount} />
            {
              renderTooltip(
                LaunchClusterTooltip.autoScaledCluster.defaultNodesCount,
                {marginLeft: 5}
              )
            }
            <a
              onClick={onUnsetChildNodes}
              style={{color: '#666', textDecoration: 'underline', marginLeft: 5}}>
              <Icon type="close" /> Reset
            </a>
          </Row>
        ];
      } else {
        return [
          <Row key="nodes count" type="flex" align="middle" style={{marginTop: 5}}>
            <span style={{marginLeft: LEFT_MARGIN, flex: 1}}>
              <a
                onClick={onSetUpChildNodesClicked}
                style={{color: '#666', textDecoration: 'underline'}}>
                Setup default child nodes count
              </a>
              {
                renderTooltip(
                  LaunchClusterTooltip.autoScaledCluster.defaultNodesCount,
                  {marginLeft: 5}
                )
              }
            </span>
          </Row>
        ];
      }
    };
    return [
      <Row key="max nodes count" type="flex" align="middle" style={{marginTop: 5}}>
        <span style={PARAMETER_TITLE_STYLE}>Auto-scaled up to:</span>
        <InputNumber
          min={this.state.setDefaultNodesCount ? 2 : 1}
          max={this.launchMaxScheduledNumber}
          disabled={this.props.disabled}
          style={Object.assign({flex: 1}, this.getInputStyle('maxNodesCount'))}
          value={this.state.maxNodesCount}
          onChange={this.onChangeMaxNodeCount} />
        {renderTooltip(LaunchClusterTooltip.autoScaledCluster.autoScaledUpTo, {marginLeft: 5})}
      </Row>,
      this.getValidationRow('maxNodesCount'),
      ...renderSetDefaultNodesCount(),
      this.getValidationRow('nodesCount')
    ].filter(r => !!r);
  };

  onOkClicked = () => {
    if (this.props.disabled) {
      this.props.onClose && this.props.onClose();
      return;
    }
    if (this.validate()) {
      this.props.onChange && this.props.onChange({
        nodesCount: this.state.launchCluster &&
        (!this.state.autoScaledCluster || this.state.setDefaultNodesCount)
          ? this.state.nodesCount
          : undefined,
        maxNodesCount: this.state.launchCluster && this.state.autoScaledCluster
          ? this.state.maxNodesCount : undefined,
        launchCluster: this.state.launchCluster,
        autoScaledCluster: this.state.autoScaledCluster,
        gridEngineEnabled: this.state.gridEngineEnabled,
        sparkEnabled: this.state.sparkEnabled
      });
    }
  };

  render () {
    const {sparkEnabled} = this.state;
    return (
      <Modal
        title={
          this.props.instanceName
            ? `Configure cluster (${this.props.instanceName})`
            : 'Configure cluster'
        }
        onCancel={this.props.onClose}
        onOk={this.onOkClicked}
        visible={this.props.visible}
        width={566}>
        <div>
          <Row type="flex">
            <div style={{marginLeft: LEFT_MARGIN}}>
              <Radio.Group
                onChange={this.onChange}
                value={this.selectedClusterType}>
                <Radio.Button value={CLUSTER_TYPE.singleNode}>Single node</Radio.Button>
                <Radio.Button value={CLUSTER_TYPE.fixedCluster}>Cluster</Radio.Button>
                <Radio.Button
                  disabled={sparkEnabled}
                  value={CLUSTER_TYPE.autoScaledCluster}
                >
                  Auto-scaled cluster
                </Radio.Button>
              </Radio.Group>
              {renderTooltip(LaunchClusterTooltip.clusterMode, {marginLeft: 10})}
            </div>
          </Row>
          {
            this.state.launchCluster && !this.state.autoScaledCluster &&
            this.renderFixedClusterConfiguration()
          }
          {
            this.state.launchCluster && this.state.autoScaledCluster &&
            this.renderAutoScaledClusterConfiguration()
          }
        </div>
      </Modal>
    );
  }

  @computed
  get launchMaxScheduledNumber () {
    if (this.props.preferences && this.props.preferences.loaded) {
      return +this.props.preferences.getPreferenceValue('launch.max.scheduled.number') - 1;
    }
    return undefined;
  }

  validate = () => {
    let nodesCount = null;
    let maxNodesCount = null;
    if (this.state.launchCluster) {
      if (
        (!this.state.autoScaledCluster || this.state.setDefaultNodesCount) &&
        isNaN(this.state.nodesCount)
      ) {
        nodesCount = 'Enter positive number';
      } else if (
        (!this.state.autoScaledCluster || this.state.setDefaultNodesCount) &&
        +this.state.nodesCount <= 0
      ) {
        nodesCount = 'Value should be greater than 0';
      } else if (!this.state.autoScaledCluster || this.state.setDefaultNodesCount) {
        const maxValue = this.launchMaxScheduledNumber;
        if (maxValue && !isNaN(maxValue) && +maxValue > 0 && +this.state.nodesCount > maxValue) {
          nodesCount = `Maximum value is ${+maxValue}`;
        }
      }
      if (this.state.autoScaledCluster) {
        if (isNaN(this.state.maxNodesCount)) {
          maxNodesCount = 'Enter positive number';
        } else if (+this.state.maxNodesCount <= 0) {
          maxNodesCount = 'Value should be greater than 0';
        } else {
          const maxValue = this.launchMaxScheduledNumber;
          if (
            maxValue &&
            !isNaN(maxValue) && +maxValue > 0 &&
            +this.state.maxNodesCount > maxValue
          ) {
            maxNodesCount = `Maximum value is ${+maxValue}`;
          }
        }
        if (
          this.state.setDefaultNodesCount &&
          !nodesCount &&
          !maxNodesCount &&
          +this.state.nodesCount >= +this.state.maxNodesCount
        ) {
          nodesCount = 'Max child nodes count should be greater than child nodes count';
          maxNodesCount = 'Max child nodes count should be greater than child nodes count';
        }
      }
    }
    this.setState({
      validation: {nodesCount, maxNodesCount}
    });
    return !nodesCount && !maxNodesCount;
  };

  componentWillReceiveProps (nextProps, nextContext) {
    if (nextProps.visible !== this.props.visible && nextProps.visible) {
      this.setState({
        launchCluster: nextProps.launchCluster,
        autoScaledCluster: nextProps.autoScaledCluster,
        gridEngineEnabled: nextProps.gridEngineEnabled,
        sparkEnabled: nextProps.sparkEnabled,
        setDefaultNodesCount: nextProps.nodesCount > 0,
        nodesCount: nextProps.nodesCount && !isNaN(nextProps.nodesCount) ? nextProps.nodesCount : 0,
        maxNodesCount: nextProps.maxNodesCount,
        validation: {
          nodesCount: null,
          maxNodesCount: null
        }
      }, this.validate);
    }
  }
}

export {ConfigureClusterDialog};

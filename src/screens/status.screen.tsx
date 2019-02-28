import * as React from 'react';
import { Grid, Line, Donut, Log } from 'react-blessed-contrib';
import { TimeStats, DataTable, COLOR_HOVER } from '../dashboard';

export interface StatusScreenProps {
  logItems: string[];
  stats: TimeStats;
  info: DataTable;
  menuOptions: object;
  maxLogEntries: number;
  hidden: boolean;
}

export class StatusScreen extends React.Component<StatusScreenProps> {
  logRef: any = null;
  menuRef: any = null;

  getLineGraphData() {
    const { entries } = this.props.stats;
    return [{
      title: 'msg/s',
      x: entries.slice(-5).map(e => `-${Math.floor((Date.now() - e.time) / 1000)}s`),
      y: entries.slice(-5).map(e => e.messages),
    }];
  }

  getInfoTableData() {
    const { headers, data } = this.props.info;
    return [
      headers,
      ...data,
    ];
  }

  getRateDonutData() {
    const { perc, max, cur } = this.props.stats;
    return [{
      percent: perc,
      label: `Max ${max} Cur: ${cur}`,
      color: 'cyan',
    }];
  }

  componentDidUpdate(prevProps: StatusScreenProps) {
    const logChanged = this.props.logItems !== prevProps.logItems;
    if (logChanged && this.logRef) {
      this.logRef.scrollTo(this.props.logItems.length);
    }
  }

  render() {
    return (
      <element hidden={this.props.hidden}>
        <Grid hidden={true} rows={14} cols={12}>
          {/* Top Menu */}
          <listbar
            ref={n => this.menuRef = n}
            row={0}
            col={0}
            rowSpan={2}
            colSpan={12}
            {...this.props.menuOptions}
          />

          {/* Line Graph */}
          <Line
            row={2}
            col={0}
            rowSpan={6}
            colSpan={8}
            label={'Message Statistics'}
            showLegend={true}
            wholeNumbersOnly={false}
            data={this.getLineGraphData()}
            style={{
              line: 'blue',
              text: 'yellow',
              baseline: 'black',
            }}
          />

          {/* Info Table */}
          <listtable
            row={8}
            col={0}
            rowSpan={6}
            colSpan={8}
            scrollable={true}
            interactive={true}
            mouse={true}
            keys={true}
            data={this.getInfoTableData()}
            align={'left'}
            style={{
              header: { bg: COLOR_HOVER, fg: 'white' },
              cell: {
                fg: 'green',
                hover: { bg: COLOR_HOVER },
              },
            }}
          />

          {/* Rate Donut */}
          <Donut
            row={2}
            col={8}
            rowSpan={6}
            colSpan={4}
            label={'Throughput msg/s'}
            radius={8}
            arcWidth={3}
            remainColor={'black'}
            yPadding={2}
            data={this.getRateDonutData()}
          />

          {/* Log */}
          <Log
            ref={n => this.logRef = n ? n.widget : null }
            row={8}
            col={8}
            rowSpan={6}
            colSpan={4}
            bufferLength={this.props.maxLogEntries}
            fg={'green'}
            selectedFg={'green'}
            label={'Client Log'}
            items={this.props.logItems}
          />
        </Grid>
      </element>
    );
  }
}

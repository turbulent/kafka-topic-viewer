import * as blessed from 'blessed';
import * as React from 'react';
import { Grid, Log } from 'react-blessed-contrib';
import { DataTable, COLOR_HOVER, Message } from '../dashboard';

interface ConsumerMessagesScreenProps {
  currentOffset: number;
  maxMessages: number;
  maxLogEntries: number;
  messages: Message[];
  logItems: string[];
  menuOptions: object;
  info: DataTable;
  onMessageSelect?: (i: number) => void;
  screen: blessed.Widgets.Screen;
}

export class ConsumerMessagesScreen extends React.Component<ConsumerMessagesScreenProps> {
  public msgList: blessed.Widgets.ListTableElement | null = null;
  public logList: any = null;

  // componentDidMount() {
  //   if (this.msgList) {
  //     this.msgList.focus();
  //     // XXX This is required because of a bug in blessed that prevents
  //     // being able to assign a label on construction of a listtable.
  //     // Consider swapping in neo-blessed.
  //     this.msgList.setLabel('Messages');
  //   }
  // }

  // componentDidUpdate() {
  //   const { logItems, messages } = this.props;

  //   if (this.logList && logItems) {
  //     this.logList.scrollTo(logItems.length);
  //   }

  //   if (this.msgList && messages) {
  //     this.msgList.scrollTo(messages.length);
  //   }
  // }

  getMsgListData() {
    // const offsets = this.props.messages.map(m => m.offset);
    // const diff = offsets.filter(o => this.state.offsets.indexOf(o) < 0);
    // if (diff.length > 0) {
    //   this.setState({ offsets });
    // }
    const { messages } = this.props;

    const dataRows = messages.map(m => {
      return (m.unpacked && m.unpacked.name && m.unpacked.id)
        ? [ m.offset, m.unpacked.name, m.unpacked.id ]
        : [ m.offset, m.value, '' ];
    });

    return [
      ['Offset', 'Value', 'ID'],
      ...dataRows,
    ];
  }

  getTableData() {
    const { headers, data } = this.props.info;
    return [
      headers,
      ...data,
    ];
  }

  onItemSelect = (_list, selected) => {
    if (this.props.onMessageSelect) {
      this.props.onMessageSelect(selected);
    }
  }

  render() {
    return (
      <Grid rows={14} cols={12}>
        {/* Top Menu */}
        <listbar
          row={0}
          col={0}
          rowSpan={2}
          colSpan={12}
          {...this.props.menuOptions}
        />

        {/* Msg List */}
        <listtable
          ref={n => this.msgList = n}
          onSelect={this.onItemSelect}
          data={this.getMsgListData()}
          row={2}
          col={4}
          rowSpan={12}
          colSpan={8}
          scrollable={true}
          interactive={true}
          mouse={true}
          keys={true}
          width={'shrink'}
          noCellBorders={true}
          pad={0}
          align={'left'}
          style={{
            header: {
              bg: COLOR_HOVER,
              fg: 'white',
            },
            cell: {
              fg: 'green',
              selected: { fg: 'white', bg: 'blue' },
              hover: { bg: COLOR_HOVER },
            },
          }}
        />

        {/* Table */}
        <listtable
          data={this.getTableData()}
          row={8}
          col={0}
          rowSpan={6}
          colSpan={4}
          scrollable={true}
          interactive={true}
          mouse={true}
          keys={true}
          align={'left'}
          pad={0}
          style={{
            header: {
              bg: COLOR_HOVER,
              fg: 'white',
            },
            cell: {
              fg: 'green',
              hover: { bg: COLOR_HOVER },
            },
          }}
        />

        {/* Log List */}
        <Log
          ref={n => this.logList = n ? n.widget : null}
          items={this.props.logItems}
          row={2}
          col={0}
          rowSpan={6}
          colSpan={4}
          bufferLength={this.props.maxLogEntries}
          fg={'green'}
          selectedFg={'green'}
          label={'Client Log'}
        />
      </Grid>
    );
  }
}

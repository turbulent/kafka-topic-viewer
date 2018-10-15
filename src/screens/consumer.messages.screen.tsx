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
  hidden: boolean;
}

interface ConsumerMessagesScreenState {
  topicFilter: string;
  nameFilter: string;
}

export class ConsumerMessagesScreen extends React.Component<ConsumerMessagesScreenProps, ConsumerMessagesScreenState> {
  public msgList: blessed.Widgets.ListTableElement | null = null;
  public logList: any = null;
  public topicFilterBox: any = null;
  public nameFilterBox: any = null;

  public state: ConsumerMessagesScreenState = {
    topicFilter: '',
    nameFilter: '',
  };

  componentDidMount() {
    if (this.msgList) {
      this.msgList.focus();
      // HACK: This is required because of a bug in blessed that prevents being
      // able to assign a label immediately on construction of a listtable.
      this.msgList.setLabel('Messages');
    }
  }

  componentDidUpdate() {
    const { logItems, messages } = this.props;

    if (this.logList && logItems) {
      this.logList.scrollTo(logItems.length);
    }

    if (this.msgList && messages) {
      this.msgList.scrollTo(messages.length);
    }
  }

  getMsgListData() {
    let { messages } = this.props;
    const { topicFilter, nameFilter } = this.state;

    if (topicFilter || nameFilter) {
      messages = messages.filter(m => {
        const matchesTopic = m.topic.toLowerCase().includes(topicFilter);
        const matchesName = m.unpacked && m.unpacked.name && m.unpacked.name.toLowerCase().includes(nameFilter);
        return matchesTopic && matchesName;
      });
    }

    const dataRows = messages.map(m => {
      return (m.unpacked && m.unpacked.name && m.unpacked.time && m.unpacked.id)
        ? [ m.topic, m.unpacked.name, this.getTimeString(m.unpacked.time) ]
        : [ m.topic, m.value, '' ];
    });

    return [
      ['Topic', 'Message', 'Timestamp'],
      ...dataRows,
    ];
  }

  getTimeString(timestamp: number): string {
    return new Date(timestamp).toISOString().replace('T', ' ').slice(0, -5);
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

  onTopicFilterSubmit = (text: string) => {
    this.setState({ topicFilter: text.toLowerCase() });
  }

  onNameFilterSubmit = (text: string) => {
    this.setState({ nameFilter: text.toLowerCase() });
  }

  render() {
    return (
      <element hidden={this.props.hidden}>
        <Grid rows={14} cols={12}>
          {/* Top Menu */}
          <listbar
            row={0}
            col={0}
            rowSpan={2}
            colSpan={6}
            {...this.props.menuOptions}
          />
          <textbox
            ref={n => this.topicFilterBox = n}
            row={0}
            col={6}
            rowSpan={1}
            colSpan={6}
            inputOnFocus={true}
            mouse={true}
            label={'Filter by topic'}
            onSubmit={this.onTopicFilterSubmit}
          />
          <textbox
            ref={n => this.nameFilterBox = n}
            row={1}
            col={6}
            rowSpan={1}
            colSpan={6}
            inputOnFocus={true}
            mouse={true}
            label={'Filter by name'}
            onSubmit={this.onNameFilterSubmit}
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
      </element>
    );
  }
}

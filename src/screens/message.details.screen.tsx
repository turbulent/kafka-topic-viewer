import * as blessed from 'blessed';
import { Grid } from 'react-blessed-contrib';
import * as React from 'react';

interface MessageScreenProps {
  messageLines: string[];
  hidden: boolean;
}

export class MessageDetailsScreen extends React.Component<MessageScreenProps> {
  public msgBox: blessed.Widgets.ListElement | null = null;

  componentDidMount() {
    if (this.msgBox) {
      this.msgBox.focus();
    }
  }

  render() {
    const { messageLines } = this.props;

    if (!messageLines || !messageLines.length) {
      return null;
    }

    return (
      <element hidden={this.props.hidden}>
        <Grid rows={14} cols={14}>
          {/* Message Box */}
          <list
            items={messageLines}
            ref={n => this.msgBox = n ? n.widget : null}
            rows={0}
            cols={0}
            rowSpan={14}
            colSpan={14}
            label={'Message Details'}
            scrollable={true}
            alwaysScroll={true}
            interactive={true}
            keys={true}
            mouse={true}
            style={{
              selected: { fg: 'white', bg: 'blue' },
              item: { fg: 'green' },
            }}
          />
        </Grid>
      </element>
    );
  }
}

'use strict'

const React = require('react');
import { Link } from 'react-router';
const Default = require('../default.js');

import Linkman from './linkman.jsx';
import LinkmanForm from './linkmanForm.jsx';
import User from './user.jsx';
import Sidebar from './sidebar.jsx';
import Topbar from './topbar.jsx';
import Message from './message.jsx';
import ChatForm from './chatForm.jsx';
import InputArea from './inputArea.jsx';

export default class Body extends React.Component {
    getMessages (linkman, userId) {
        if (!linkman) {
            return;
        }
        return linkman.messages.map(message => {
            return <Message
                avatar={ linkman.avatar }
                nickname={ linkman.nickname }
                time={ message.time }
                content={ message.content }
                align={ linkman.id === userId ? 'right' : 'left' }
            />
        });
    }
    
    getTopbar (linkman) {
        if (!linkman) {
            return <Topbar noNickname={ true }/>
        }
        return <Topbar
            avatar={ linkman.avatar }
            nickname={ linkman.nickname }
        />
    }
    
    render () {
        let { user, linkmans } = this.props;
        user = user || Default.user;
        linkmans = linkmans || Default.linkmans
        
        return (
            <div style={{
                flex: 1,
                display: 'flex',
            }}>
                <Sidebar>
                    <User 
                        nickname={ user.nickname }
                        avatar={ user.avatar }
                    />
                    <nav 
                        style={{
                            flex: 1,
                            marginTop: '100px',
                        }}
                    >
                        <Link to="setting">设置</Link>
                    </nav>
                </Sidebar>
                <LinkmanForm>
                    {
                        linkmans.map((linkman, index) => {
                            return <Linkman
                                avatar={ linkman.avatar }
                                nickname={ linkman.nickname }
                                time={ linkman.messages[linkman.messages.length - 1].time }
                                content={ linkman.messages[linkman.messages.length - 1].content }
                            />
                        })
                    }
                </LinkmanForm>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FDFFFF',
                }}>
                    { this.getTopbar(linkmans[-1]) }
                    <ChatForm>
                        {
                            this.getMessages(linkmans[-1], 1)
                        }
                    </ChatForm>
                    <InputArea/>
                </div>
            </div>
        )
    }
}
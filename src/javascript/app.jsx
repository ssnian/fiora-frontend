'use strict'

const React = require('react');
const ReactDom = require('react-dom');
import { Provider, connect } from 'react-redux';
const Action = require('./actions/common.js');
const Store = require('./stores/common.js');
import { Router, Route, IndexRoute, browserHistory, hashHistory } from 'react-router';
import { message, notification } from 'antd';
require('html5-desktop-notifications');
const Config = require('../../config.js');
const Default = require('./default.js');

const socketIOClient = require('socket.io-client');
const sailsIOClient = require('sails.io.js');
const io = sailsIOClient(socketIOClient);

import Header from './components/header.jsx';
import Main from './pages/main.jsx';
import Register from './pages/register.jsx';
import Login from './pages/login.jsx';
import Setting from './pages/setting.jsx';
import About from './pages/about.jsx';
import Comment from './pages/comment.jsx';
import ImageViewer from './components/imageViewer.jsx';

message.config({top: 80});
notification.config({top: 100});

io.sails.url = Config[process.env.NODE_ENV].server;

export default class App extends React.Component {
    handleLinkmanClick (user, isGroup) {
        this.props.dispatch(Action.setCurrentLinkman(user, isGroup));
    }
    
    handleLogin (username, password) {
        this.props.login(username, password).then(result => {
            if (result.status === 201) {
                window.localStorage.setItem('token', result.data.token);
                this.context.router.push('/');
            }
            else {
                if (result.msg.match(/user.*not exists/)) {
                    message.warn('该用户不存在');
                    return;
                }
                else if (result.msg.match(/password not correct/)) {
                    message.warn('密码错误');
                    return;
                }
            }
        });
    }
    
    handleLogout () {
        this.props.logout().then(result => {
            window.location.reload();
        });
    }
    
    handleRegister (username, password) {
        this.props.register(username, password).then(result => {
            if (result.status === 201) {
                message.info('注册成功, 请登录');
                this.context.router.push('/login');
            }
            else {
                message.warn(result.msg);
            }
        });
    }
    
    handleSetting (avatar) {
        if (avatar === '') {
            return;
        }
        this.props.setting(this.props.reducer.isLogged, avatar).then(result => {
            this.context.router.push('/');
        });
    }
    
    handleToggleNotification () {
        this.props.dispatch(Action.toggleNotification());
    }
    
    handleSend (content, type, linkman, isToGroup) {
        if (!content || content.text === '') {
            return;
        }
        this.props.send(this.props.reducer.user, content, type, linkman, isToGroup).then(result => {
            if (result.data.msg === 'user not online') {
                message.warn('对方不在线');
            }
        });
    }
    
    handleComment (content) {
        if (content === '') {
            return;
        }
        if (!this.props.reducer.isLogged) {
            return message.warn('请登录后再发表评论, 谢谢参与!');
        }
        io.socket.post('/comment', {token: io.sails.token, content}, (result, jwr) => {
            if (jwr.statusCode === 200) {
                this.getComment();
                return message.warn('添加评论成功, 谢谢参与!');
            }
        });
    }
    
    getComment () {
        io.socket.get('/comment', {}, (result, jwr) => {
            if (jwr.statusCode === 200) {
                this.props.dispatch(Action.setComments(result));
            }
        });
    }
    
    handleImageViewerClose () {
        this.setState({imageViewer: false});
    }
    
    handleImageMessageViewer (src) {
        this.setState({
            src,
            imageViewer: true,
        });
    }
    
    handleMessageClick (from) {
        this.props.dispatch(Action.addLinkman(from));
        this.props.dispatch(Action.setCurrentLinkman(from, false));
    }
    
    constructor (props, context) {
        super(props, context);
        this.state = {
            src: '',
            imageViewer: false,
        };
        
    }
    
    static contextTypes = {
        router: React.PropTypes.object
    };
 
    componentWillMount () {
        let token = window.localStorage.getItem('token');
        this.props.dispatch(Action.setToken(token));
        
        io.socket.on('connect', () => {
            io.socket.get('/user', {token}, (result, jwr) => {
                if (jwr.statusCode === 200) {
                    io.sails.token = token;
                    
                    if (result.id.toString().startsWith('guest')) {
                        notification['info']({
                            message: '提示',
                            description: '您正在以游客的身份登录聊天室, 游客的消息记录/昵称/头像不会被保存, 欢迎注册帐号使用',
                            duration: 8,
                        });
                    }
                    
                    this.props.dispatch(Action.setUser(result));
                    this.props.dispatch(Action.setCurrentLinkman(result.groups[0], true));
                    this.props.dispatch(Action.setLoginStatus(!result.id.toString().startsWith('guest')));
                }
                else {
                    this.props.dispatch(Action.setUser(undefined));
                    this.props.dispatch(Action.setLoginStatus(false));
                }
            });
        });
        
        io.socket.on('message', result => {
            if (this.props.reducer.showNotification && (!this.props.reducer.windowVisible || window.location.pathname !== '/')) {
                let notification = notify.createNotification(result.from.username, {
                    icon: result.from.avatar,
                    body: result.content.text.slice(0, 60),
                    tag: result.from.id,
                });
            }
            if (result.toGroup) {
                this.props.dispatch(Action.addGroupMessage(result.toGroup, result));
            }
            else {
                this.props.dispatch(Action.addUserMessage(result.from.id, result));
            }
        });
    }
    
    componentDidMount () {
        window.onfocus = () => this.props.dispatch(Action.setWindowVisible(true));
        window.onblur = () => this.props.dispatch(Action.setWindowVisible(false));
        this.props.dispatch(Action.setWindowVisible(true));
        
        if (notify.permissionLevel() === notify.PERMISSION_DEFAULT) {
            notify.requestPermission();
        }
        else if (notify.permissionLevel() === notify.PERMISSION_DENIED) {
            alert('您已关闭了消息通知，如需桌面通知，请在浏览器设置中允许通知');
        }
        notify.config({
            pageVisibility: true,
            autoClose: 3000,
        });
    }
    
    render() {
        let { user, currentLinkman, isLogged, comments, showNotification } = this.props.reducer;
        user = user || Default.user;
        currentLinkman = currentLinkman || Default.currentLinkman;
        isLogged = isLogged || Default.isLogged;
        comments = comments || Default.comments;
        
        const Child = this.props.children;
        const props = {
            main: {
                user,
                currentLinkman: currentLinkman,
                handleLinkmanClick: this.handleLinkmanClick.bind(this),
                handleSend: this.handleSend.bind(this),
                handleImageMessageViewer: this.handleImageMessageViewer.bind(this),
                handleMessageClick: this.handleMessageClick.bind(this)
            },
            register: {
                handleRegister: this.handleRegister.bind(this),
            },
            login: {
                handleLogin: this.handleLogin.bind(this),
            },
            setting: {
                handleSetting: this.handleSetting.bind(this),
                handleToggleNotification: this.handleToggleNotification.bind(this),
                showNotification
            },
            comment: {
                handleComment: this.handleComment.bind(this),
                getComment: this.getComment.bind(this),
                comments,
            }
        }
        
        return (
            <div>
                <ImageViewer display={ this.state.imageViewer }
                    handleClose={ this.handleImageViewerClose.bind(this) }
                    src={ this.state.src }
                />
                <div style={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <Header handleLogout={ this.handleLogout.bind(this) } isLogged={ isLogged }/>
                    {
                        Child && React.cloneElement(Child, props[Child.props.route.page || Child.props.route.path])
                    }
                </div>
            </div>
        );
    }
}

const mapActionToProps = dispatch => {
    return {
        dispatch: dispatch,
        login: (username, password) => Action.login(dispatch, username, password, io),
        logout: () => Action.logout(dispatch, io),
        register: (username, password) => Action.register(dispatch, username, password, io),
        setting: (isLogged, avatar) => Action.setting(dispatch, isLogged, avatar, io),
        send: (user, content, type, linkman, isToGroup) => Action.send(dispatch, user, content, type, linkman, isToGroup, io)
    };
};

const ConnectedApp = connect(state => state, mapActionToProps)(App);

ReactDom.render(
    <Provider store={ Store }>
        <Router history={ browserHistory }>
            <Route path="/" component={ ConnectedApp }>
                <IndexRoute page="main" component={ Main }/>
                <Route path="register" component={ Register }/>
                <Route path="login" component={ Login }/>
                <Route path="setting" component={ Setting }/>
                <Route path="about" component={ About }/>
                <Route path="comment" component={ Comment }/>
            </Route>
        </Router>
    </Provider>, 
    document.querySelector('#app')
);
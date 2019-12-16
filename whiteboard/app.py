from flask import Flask, render_template, url_for
from flask_socketio import SocketIO, emit
import os

from whiteboard import secrets


# Taken from https://web.archive.org/web/20190420170234/http://flask.pocoo.org/snippets/35/
class ReverseProxied(object):
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        script_name = environ.get('HTTP_X_SCRIPT_NAME', '')
        if script_name:
            environ['SCRIPT_NAME'] = script_name
            path_info = environ['PATH_INFO']
            if path_info.startswith(script_name):
                environ['PATH_INFO'] = path_info[len(script_name):]

        scheme = environ.get('HTTP_X_SCHEME', '')
        if scheme:
            environ['wsgi.url_scheme'] = scheme
        return self.app(environ, start_response)


app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.FLASK_SECRET_KEY
app.wsgi_app = ReverseProxied(app.wsgi_app)
socketio = SocketIO(app)

users = 0
button_state = False
plots = []

# Taken from https://stackoverflow.com/questions/32132648/python-flask-and-jinja2-passing-parameters-to-url-for
@app.context_processor
def override_url_for():
    if app.debug:
        return dict(url_for=dated_url_for)
    return dict(url_for=url_for)


def dated_url_for(endpoint, **values):
    if endpoint == 'static':
        filename = values.get('filename', None)
        if filename:
            file_path = os.path.join(app.root_path,
                                     endpoint, filename)
            values['q'] = int(os.stat(file_path).st_mtime)
    return url_for(endpoint, **values)


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('connect')
def socket_connect():
    global users
    users += 1
    emit("users", users, broadcast=True)
    emit("init state", plots)


@socketio.on('disconnect')
def socket_disconnect():
    global users
    users -= 1
    emit('users', users, broadcast=True)


@socketio.on('heart click')
def heart_click():
    emit('heart click', broadcast=True)


@socketio.on('heart release')
def heart_release():
    emit('heart release', broadcast=True)


@socketio.on('plot')
def add_plot(data):
    global plots
    plots.append(data)
    emit('draw', data, include_self=False, broadcast=True)


@socketio.on('clear board')
def clear_board():
    global plots
    plots = []
    emit('clear board', include_self=False, broadcast=True)


if __name__ == '__main__':
    print("Server running.")
    socketio.run(app, host='0.0.0.0', debug=True)

from flask import Flask

from flask_admin import Admin, BaseView, expose
from flask_admin.contrib.fileadmin import FileAdmin


class UsersView(BaseView):
    def __init__(self):
        super(UsersView, self).__init__(
            name="Users",
            endpoint='users',
            menu_icon_type='glyph',
            menu_icon_value='glyphicon-user')

    @expose('/')
    def index(self):
        return self.render('myadmin.html')


class TasksView(BaseView):
    def __init__(self):
        super(TasksView, self).__init__(
            name="Tasks",
            endpoint='tasks',
            menu_icon_type='glyph',
            menu_icon_value='glyphicon-knight')

    @expose('/')
    def index(self):
        return self.render('anotheradmin.html')

    @expose('/test/')
    def test(self):
        return self.render('test.html')


class RawFileView(FileAdmin):
    editable_extensions = ('md', 'html', 'txt', 'json')

    def __init__(self):
        super(RawFileView, self).__init__(
            '/home/wil93/git/tmsocial/test_site/config',
            name='Files (use caution!)',
            endpoint='raw-files',
            menu_icon_type='glyph',
            menu_icon_value='glyphicon-hdd')


class RawTerminalView(BaseView):
    def __init__(self):
        super(RawTerminalView, self).__init__(
            name="Terminal (use caution!)",
            endpoint='raw-terminal',
            menu_icon_type='glyph',
            menu_icon_value='glyphicon-console')

    @expose('/')
    def index(self):
        return self.render('terminal.html')


# Create flask app
app = Flask(__name__)
app.config.from_pyfile('config.py')

# Flask views
@app.route('/')
def index():
    return '<a href="/admin/">Click me to get to Admin!</a>'


# Create admin interface
admin = Admin(name="TMSocial Admin", template_mode='bootstrap3')
admin.add_view(UsersView())
admin.add_view(TasksView())
admin.add_view(RawFileView())
admin.add_view(RawTerminalView())
admin.init_app(app)

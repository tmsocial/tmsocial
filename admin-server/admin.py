import json
import os

from flask import Flask

from flask_admin.base import Admin, BaseView, expose
from flask_admin.contrib.fileadmin import FileAdmin


from flask_admin.model import BaseModelView
from wtforms import Form, StringField, validators


class UserModel:
    _name = None
    _display_name = None

    @property
    def primary_key(self):
        return self._name

    @property
    def name(self):
        return self._name

    @property
    def display_name(self):
        return self._display_name

    def __init__(self, name, display_name):
        self._name = name
        self._display_name = display_name

    @staticmethod
    def create_new(name, display_name):
        u = UserModel(name, display_name)

        # TODO: here "site1" is hardcoded!
        new_user_path = os.path.join(app.config["FILES_PATH"], "config", "site1", "users", u._name)

        os.mkdir(new_user_path)
        with open(os.path.join(new_user_path, "data.json"), "w") as f:
            f.write(json.dumps({
                'display_name': display_name
            }))

        return u


class UsersView(BaseModelView):
    def __init__(self):
        super(UsersView, self).__init__(
            UserModel,
            name="Users",
            endpoint='users',
            menu_icon_type='glyph',
            menu_icon_value='glyphicon-user')

    def get_pk_value(self, model):
        return model.primary_key

    def scaffold_list_columns(self):
        return ['name', 'display_name']

    def scaffold_sortable_columns(self):
        return {"name": None, "display_name": None}

    def scaffold_form(self):
        class UserForm(Form):
            name = StringField('Name', [validators.Length(min=1, max=20)])
            display_name = StringField('Display Name', [validators.Length(min=1, max=100)])

        return UserForm

    def get_list(self, page, sort_field, sort_desc, search, filters, page_size=None):
        """
        Parameters:
            page – Page number, 0 based. Can be set to None if it is first page.
            sort_field – Sort column name or None.
            sort_desc – If set to True, sorting is in descending order.
            search – Search query
            filters – List of filter tuples. First value in a tuple is a search index, second value is a search value.
            page_size – Number of results. Defaults to ModelView’s page_size. Can be overriden to change the page_size limit. Removing the page_size limit requires setting page_size to 0 or False.
        """
        print("page, sort_field, sort_desc, search, filters, page_size")
        print(page, sort_field, sort_desc, search, filters, page_size)

        # TODO: here "site1" is hardcoded
        users_path = os.path.join(app.config["FILES_PATH"], "config", "site1", "users")

        count = 0
        results = []
        for dirname in os.listdir(users_path):
            results.append(self.get_one(dirname))
            count += 1

        if sort_field:
            results.sort(key=lambda e: getattr(e, sort_field), reverse=sort_desc)

        return count, results

    def get_one(self, key):
        # TODO: here "site1" is hardcoded
        users_path = os.path.join(app.config["FILES_PATH"], "config", "site1", "users")

        if os.path.isdir(os.path.join(users_path, key)):
            data = json.loads(open(os.path.join(users_path, key, "data.json")).read())
            return UserModel(key, data["display_name"])

    def create_model(self, form):
        return UserModel.create_new(form.name.data, form.display_name.data)


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
            app.config["FILES_PATH"],
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
admin = Admin(name="TMAdmin", template_mode='bootstrap3')
admin.add_view(UsersView())
admin.add_view(TasksView())
admin.add_view(RawFileView())
admin.add_view(RawTerminalView())
admin.init_app(app)

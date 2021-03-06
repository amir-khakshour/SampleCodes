from zope.interface import Interface


class IPoller(Interface):
    """A component that polls for tasks that need to done"""

    def poll():
        """Called periodically to poll for tasks"""

    def next():
        """Return the next task.

        It should return a Deferred which will get fired when there is a new
        project that needs to run, or already fired if there was a project
        waiting to run already.

        The task is a dict containing (at least):
        * the uri of the task to be run
        * the client uri
        * the callback uri
        """

    def update_tasks():
        """Called when tasks may have changed, to refresh the available
        tasks"""


class ITaskStorage(Interface):

    def start():
        """Called to initilize database and create connection to DB"""

    def insert(date):
        """Called on Insert action"""

    def count():
        """number of rows in storage table"""

    def pop():
        """Pop a message from storage and return it"""


class IScheduler(Interface):
    """A component to schedule task runs"""

    def schedule():
        """Schedule a run for a given task"""

    def list_tasks():
        """Return the list of available tasks"""

    def update_tasks():
        """Called when tasks may have changed, to refresh the available
        tasks"""

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Notification } from '../types/Notification';

export default function NotificationsList() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const renderNotificationContent = (notification: Notification) => {
    const actorName = <span className="font-medium">{notification.actorName}</span>;
    
    switch (notification.type) {
      case 'follow':
        return <>{actorName} started following you</>;
      case 'unfollow':
        return <>{actorName} unfollowed you</>;
      case 'like':
        return (
          <>
            {actorName} liked your post:{' '}
            <Link 
              to={`/posts/${notification.postId}`} 
              className="text-gray-600 hover:text-gray-900 block mt-1 text-sm"
            >
              "{notification.postContent}"
            </Link>
          </>
        );
      case 'unlike':
        return (
          <>
            {actorName} removed their like from your post:{' '}
            <Link 
              to={`/posts/${notification.postId}`} 
              className="text-gray-600 hover:text-gray-900 block mt-1 text-sm"
            >
              "{notification.postContent}"
            </Link>
          </>
        );
      default:
        return <>{actorName} interacted with your profile</>;
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="relative inline-flex items-center p-2 text-gray-600 hover:text-gray-900 focus:outline-none">
          <BellIcon className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-96 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Menu.Item key={notification.id}>
                  {({ active }) => (
                    <div
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } ${
                        !notification.read ? 'bg-blue-50' : ''
                      } block px-4 py-3`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start">
                        <Link to={`/users/${notification.actorId}`}>
                          <img
                            src="https://i.pravatar.cc/150?img=4"
                            alt={notification.actorName}
                            className="h-8 w-8 rounded-full hover:opacity-80 transition-opacity"
                          />
                        </Link>
                        <div className="ml-3 flex-1">
                          <p className="text-sm text-gray-900">
                            {renderNotificationContent(notification)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(notification.createdAt instanceof Timestamp ? notification.createdAt.toDate() : notification.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Menu.Item>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No notifications yet
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
} 
import generateId from 'shortid';
import axios from 'axios';

import socket, { MethodCall, SocketMessage } from './socket';
import isClient from './isClient';

const methodWrapper = (method: string, ...args: any[]): Promise<any> => {
  console.log('methodWrapper', method, [...args]);
  if (!isClient()) {
    const apiPath = method.split('.').join('/');
    console.log('on server side, calling REST API method', apiPath);
    return new Promise<any>((resolve, reject): void => {
      axios.post('http://localhost:4000/api/${apiPath}', { params: args })
        .then((response) => {
          resolve(response.data);
        })
        .catch(reject);
    });
  }
  return new Promise<any>((resolve, reject): void => {
    console.log('socket connected?', socket && socket.connected);
    if (socket) {
      if (socket.disconnected) {
        console.log('socket disconnected, connecting');
        socket.connect();
      }
      const id = generateId();
      console.log('id', id);
      console.log('socket sessionId', socket.sessionId);
      socket.on(id, (res: SocketMessage): void => {
        socket.off(id);
        if (res.o) {
          resolve(res.d);
        } else {
          const error = new Error(res.e);
          error.stack = res.s;
          reject(error);
        }
      });

      const call: MethodCall = {
        method,
        id,
        params: args,
      };
      
      console.log('before emit, call:', call);
      socket.emit('*', call);
    } else {
      console.error('No client socket available!');
      reject(new Error('No client socket available!'));
    }
  });
};

/**
 * Ping method
 */
const ping = (): Promise<string> => methodWrapper('ping');

const api = {
  ping,
};

export default api;

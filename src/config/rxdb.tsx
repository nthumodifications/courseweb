'use client';
import { addRxPlugin, createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { Provider } from 'rxdb-hooks';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';

export const initializeRxDB = async () => {
    // create RxDB
    if (process.env.NODE_ENV === 'development') {
      await import('rxdb/plugins/dev-mode').then(
          module => addRxPlugin(module.RxDBDevModePlugin)
      );
    }
    addRxPlugin(RxDBMigrationPlugin);


    const db = await createRxDatabase({
      name: 'nthumods-calendar',
      storage: getRxStorageDexie(),
      ignoreDuplicate: true,
    });
  
    // create collection based on CalendarEvent
    const eventsSchema = {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          maxLength: 100,
        },
        title: {
          type: 'string',
        },
        details: {
          type: 'string',
        },
        allDay: {
          type: 'boolean',
        },
        start: {
          type: 'string',
          format: 'date-time',
        },
        end: {
          type: 'string',
          format: 'date-time',
        },
        repeat: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly'],
            },
            interval: {
              type: 'number',
            },
            count: {
              type: 'number',
            },
            date: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        color: {
          type: 'string',
        },
        tag: {
          type: 'string',
        },
      },
      required: ['id', 'title', 'allDay', 'start', 'end', 'repeat', 'color', 'tag'],
    }

    await db.addCollections({
      events: {
        schema: eventsSchema,
      },
    });
  
    return db;
};
  

export const RxDBProvider:FC<PropsWithChildren> = ({ children }) => {
    const [db, setDb] = useState<Awaited<ReturnType<typeof initializeRxDB>>>();
  
    useEffect(() => {
      initializeRxDB().then(setDb);
    }, []);
  
    return <Provider db={db}>{children}</Provider>;
};
import {
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { createContext, useContext, useState } from 'react';
import invariant from 'tiny-invariant';

type ItemPosition = 'first' | 'last' | 'middle' | 'only'

type CleanupFn = () => void

type ItemEntry = {
  itemId: string;
  element: HTMLElement;
}

type ListContextValue = {
  getListLength: () => number;
  registerItem: (entry: ItemEntry) => CleanupFn;
  reorderItem: (args: {
    startIndex: number;
    indexOfTarget: number;
    closestEdgeOfTarget: Edge | null;
  }) => void;
  instanceId: symbol
}

const ListContext = createContext<ListContextValue | null>(null)

const useListContext = () => {
  const listContext = useContext(ListContext)
  invariant(listContext !== null, 'useListContext must be used within a ListContextProvider')
  return listContext
}

type Item = {
  id: string;
  label: string;
}

const itemKey = Symbol('item')

type ItemData = {
  [itemKey]: true,
  item: Item,
  index: number,
  instanceId: symbol
}

const getItemData = ({ item, index, instanceId }: {
  item: Item;
  index: number;
  instanceId: symbol
}): ItemData => ({
  [itemKey]: true,
  item,
  index,
  instanceId
})

const isItemData = (data: Record<string | symbol, unknown>): data is ItemData => Boolean(data[itemKey])

const getItemPosition = ({ index, items }: { index: number; items: Item[] }): ItemPosition => {
  if (items.length === 1) {
    return 'only'
  }

  if (index === 0) {
    return 'first'
  }

  if (index === items.length - 1) {
    return 'last'
  }

  return 'middle'
}

type DraggableState = { type: 'idle' } | { type: 'preview'; container: HTMLElement } | { type: 'dragging' }

const idleState: DraggableState = { type: 'idle' }
const draggingState: DraggableState = { type: 'dragging' }

const defaultItems: Item[] = [
  {
    id: 'task-1',
    label: 'Organize a team-building event',
  },
  {
    id: 'task-2',
    label: 'Create and maintain office inventory',
  },
  {
    id: 'task-3',
    label: 'Update company website content',
  },
  {
    id: 'task-4',
    label: 'Plan and execute marketing campaigns',
  },
  {
    id: 'task-5',
    label: 'Coordinate employee training sessions',
  },
  {
    id: 'task-6',
    label: 'Manage facility maintenance',
  },
  {
    id: 'task-7',
    label: 'Organize customer feedback surveys',
  },
  {
    id: 'task-8',
    label: 'Coordinate travel arrangements',
  },
];

const getItemRegistry = () => {
  const registry = new Map<string, HTMLElement>()

  const register = ({ itemId, element }: ItemEntry) => {
    registry.set(itemId, element)

    return function unregister() {
      registry.delete(itemId)
    }
  }

  const getElement = (itemId: string): HTMLElement | null => {
    return registry.get(itemId) ?? null
  }

  return { register, getElement }
}

type ListState = {
  items: Item[];
  lastCardMoved: {
    item: Item;
    previousIndex: number;
    currentIndex: number;
    numberOfItems: number;
  } | null;
}

function App() {
  const [{ items, lastCardMoved }, setListState] = useState<ListState>({
    items: defaultItems,
    lastCardMoved: null
  })

  const [registry] = useState(getItemRegistry)
  console.log(registry)
  const [instanceId] = useState(() => Symbol('instance-id'))
  console.log(instanceId)

  return <ListContext.Provider value={contextValue}>
    <div>

      {items.map((item, index) => {
        return <ListItem
          key={item.id}
          item={item}
          index={index}
          position={getItemPosition({ index, items })}
        />
      })}
    </div>
  </ListContext.Provider>
}

export default App
import { Button } from '@/components/ui/button'
import {
	MenuContent,
	MenuItem,
	MenuRoot,
	MenuTrigger,
} from '@/components/ui/menu'
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box'

import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash'
import {
	extractClosestEdge,
	type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index'
import * as liveRegion from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder'
import { Stack, Text } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react/box'
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { BiArea } from 'react-icons/bi'
import invariant from 'tiny-invariant'

type ItemPosition = 'first' | 'last' | 'middle' | 'only'

type CleanupFn = () => void

type ItemEntry = {
	itemId: string
	element: HTMLElement
}

type ListContextValue = {
	getListLength: () => number
	registerItem: (entry: ItemEntry) => CleanupFn
	reorderItem: (args: {
		startIndex: number
		indexOfTarget: number
		closestEdgeOfTarget: Edge | null
	}) => void
	instanceId: symbol
}

const ListContext = createContext<ListContextValue | null>(null)

const useListContext = () => {
	const listContext = useContext(ListContext)
	invariant(
		listContext !== null,
		'useListContext must be used within a ListContextProvider'
	)
	return listContext
}

type Item = {
	id: string
	label: string
}

const itemKey = Symbol('item')

type ItemData = {
	[itemKey]: true
	item: Item
	index: number
	instanceId: symbol
}

const getItemData = ({
	item,
	index,
	instanceId,
}: {
	item: Item
	index: number
	instanceId: symbol
}): ItemData => ({
	[itemKey]: true,
	item,
	index,
	instanceId,
})

const isItemData = (data: Record<string | symbol, unknown>): data is ItemData =>
	Boolean(data[itemKey])

const getItemPosition = ({
	index,
	items,
}: {
	index: number
	items: Item[]
}): ItemPosition => {
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

type DraggableState =
	| { type: 'idle' }
	| { type: 'preview'; container: HTMLElement }
	| { type: 'dragging' }

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
]

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
	items: Item[]
	lastCardMoved: {
		item: Item
		previousIndex: number
		currentIndex: number
		numberOfItems: number
	} | null
}

const DropDownContent = () => {
	return (
		<MenuContent>
			<MenuItem value='move-top'>Move to top</MenuItem>
			<MenuItem value='move-up'>Move up</MenuItem>
			<MenuItem value='move-down'>Move down</MenuItem>
			<MenuItem value='move-bottom'>Move to bottom</MenuItem>
		</MenuContent>
	)
}

const ListItem = ({
	item,
	index,
	position,
}: {
	item: Item
	index: number
	position: ItemPosition
}) => {
	const { registerItem, instanceId } = useListContext()

	const ref = useRef<HTMLDivElement>(null)

	const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
	const dragHandleRef = useRef<HTMLButtonElement>(null)

	const [draggableState, setDraggableState] =
		useState<DraggableState>(idleState)

	return (
		<Box ref={ref}>
			<Box
				display='flex'
				alignItems='center'
				gap={2}
				p={3}
				border='1px solid black'
				borderRadius='sm'
			>
				<MenuRoot>
					<MenuTrigger asChild>
						<Button size='sm'>
							<BiArea />
						</Button>
					</MenuTrigger>
					<DropDownContent />
				</MenuRoot>

				<Text>
					{item.id} - {item.label}
				</Text>
			</Box>
			{closestEdge && <DropIndicator edge={closestEdge} gap='1px' />}
		</Box>
	)
}

function App() {
	const [{ items, lastCardMoved }, setListState] = useState<ListState>({
		items: defaultItems,
		lastCardMoved: null,
	})

	console.log('items', items)
	console.log('lastCardMoved', lastCardMoved)

	const [registry] = useState(getItemRegistry)

	const [instanceId] = useState(() => Symbol('instance-id'))

	const getListLength = useCallback(() => items.length, [items.length])

	const reorderItem = useCallback(
		({
			startIndex,
			indexOfTarget,
			closestEdgeOfTarget,
		}: {
			startIndex: number
			indexOfTarget: number
			closestEdgeOfTarget: Edge | null
		}) => {
			const finishIndex = getReorderDestinationIndex({
				startIndex,
				indexOfTarget,
				closestEdgeOfTarget,
				axis: 'vertical',
			})

			if (finishIndex === startIndex) {
				return
			}

			setListState((listState) => {
				const item = listState.items[startIndex]

				return {
					items: reorder({
						list: listState.items,
						startIndex,
						finishIndex,
					}),
					lastCardMoved: {
						item,
						previousIndex: startIndex,
						currentIndex: finishIndex,
						numberOfItems: listState.items.length,
					},
				}
			})
		},
		[]
	)

	const contextValue: ListContextValue = useMemo(() => {
		return {
			registerItem: registry.register,
			reorderItem,
			instanceId,
			getListLength,
		}
	}, [registry.register, reorderItem, instanceId, getListLength])

	useEffect(() => {
		return monitorForElements({
			canMonitor({ source }) {
				console.group('canMonitor')
				console.log('source', source)
				console.groupEnd()

				return (
					isItemData(source.data) &&
					source.data.instanceId === instanceId
				)
			},
			onDrop({ location, source }) {
				console.group('onDrop')
				console.log('location', location)
				console.log('source', source)
				console.groupEnd()
				const target = location.current.dropTargets[0]

				if (!target) {
					return
				}

				const sourceData = source.data
				const targetData = target.data

				if (!isItemData(sourceData) || !isItemData(targetData)) {
					return
				}

				const indexOfTarget = items.findIndex(
					(item) => item.id === targetData.item.id
				)
				if (indexOfTarget < 0) {
					return
				}

				const closestEdgeOfTarget = extractClosestEdge(targetData)

				reorderItem({
					startIndex: sourceData.index,
					indexOfTarget,
					closestEdgeOfTarget,
				})
			},
		})
	}, [instanceId, items, reorderItem])

	useEffect(() => {
		if (lastCardMoved === null) {
			return
		}

		const { item, previousIndex, currentIndex, numberOfItems } =
			lastCardMoved
		const element = registry.getElement(item.id)

		if (element) {
			console.group('triggerPostMoveFlash')
			triggerPostMoveFlash(element)
			console.groupEnd()
		}

		liveRegion.announce(
			`You've moved ${item.label} from position ${
				previousIndex + 1
			} to position ${currentIndex + 1} of ${numberOfItems}.`
		)
	}, [lastCardMoved, registry])

	useEffect(() => {
		return function cleanup() {
			liveRegion.cleanup()
		}
	}, [])

	return (
		<ListContext.Provider value={contextValue}>
			<Stack gap={0} w={600} p={10}>
				{items.map((item, index) => (
					<ListItem
						key={item.id}
						item={item}
						index={index}
						position={getItemPosition({ index, items })}
					/>
				))}
			</Stack>
		</ListContext.Provider>
	)
}

export default App

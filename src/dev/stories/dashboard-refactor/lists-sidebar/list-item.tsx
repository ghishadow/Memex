import React from 'react'
import { storiesOf } from '@storybook/react'
import ListItemBase from 'src/dashboard-refactor/lists-sidebar/components/list-item/ListItemBase'

const receivesDraggableItemsState = {
    isDroppable: true, // this defines whether items can be dropped (not whether there is a state change on drag-over)
    onDragOver: () => {},
    onDragLeave: () => {},
    onDrop: () => {},
}

const listItemProps = {
    default: {
        isEditing: false,
        onMoreActionClick: function () {},
        listName: 'Let it be known that',
        selectedState: {
            onSelection: function () {},
            isSelected: false,
        },
        hoverState: {
            onHoverEnter: () => {},
            onHoverLeave: () => {},
            isHovered: false,
        },
        receivesDraggableItemsState,
    },
    hovered: {
        isEditing: false,
        onMoreActionClick: function () {},
        listName: 'Existence',
        selectedState: {
            onSelection: function () {},
            isSelected: false,
        },
        hoverState: {
            onHoverEnter: () => {},
            onHoverLeave: () => {},
            isHovered: true,
        },
        receivesDraggableItemsState,
    },
    selected: {
        isEditing: false,
        onMoreActionClick: function () {},
        listName: 'Is',
        selectedState: {
            onSelection: function () {},
            isSelected: true,
        },
        hoverState: {
            onHoverEnter: () => {},
            onHoverLeave: () => {},
            isHovered: false,
        },
        receivesDraggableItemsState,
    },
    hoveredAndSelected: {
        isEditing: false,
        onMoreActionClick: function () {},
        listName: 'Suffering',
        selectedState: {
            onSelection: function () {},
            isSelected: true,
        },
        hoverState: {
            onHoverEnter: () => {},
            onHoverLeave: () => {},
            isHovered: true,
        },
        receivesDraggableItemsState,
    },
    isEditing: {
        isEditing: true,
        onMoreActionClick: function () {},
        listName: 'Editable List Name',
        selectedState: {
            onSelection: function () {},
            isSelected: true,
        },
        hoverState: {
            onHoverEnter: () => {},
            onHoverLeave: () => {},
            isHovered: false,
        },
        receivesDraggableItemsState,
    },
}

const stories = storiesOf('Dashboard Refactor|Lists Sidebar/ListItem', module)

stories.add('Default', () => <ListItemBase {...listItemProps.default} />)
stories.add('Hovered', () => <ListItemBase {...listItemProps.hovered} />)
stories.add('Selected', () => <ListItemBase {...listItemProps.selected} />)
stories.add('Hovered and Selected', () => (
    <ListItemBase {...listItemProps.hoveredAndSelected} />
))
stories.add('Editing', () => <ListItemBase {...listItemProps.isEditing} />)

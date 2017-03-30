import eventProcessor from 'core/services/buildEventProcessor';
import events from 'core/events';

let rxServiceUpdateFailed, rxServiceUpdated, rxServicesInit;

const init = () => {
    const latestState = new Map();

    rxServiceUpdated = events.getByName('serviceUpdated').subscribe((ev) => {
        const oldState = latestState.get(ev.source) || { name: ev.source, items: [] };
        const newState = { name: ev.source, items: ev.details };
        newState.items = mixInPreviousState(oldState.items, newState.items);
        latestState.set(ev.source, newState);
        pushStateUpdated();
        eventProcessor.process({ oldState, newState });
    });

    const mixInPreviousState = (oldItems, newItems) => {
        return newItems.map((newBuild) => {
            const oldBuild = oldItems
                .filter((build) => build.id === newBuild.id)[0];
            return Object.assign({}, oldBuild, { error: null }, newBuild);
        });
    };

    rxServiceUpdateFailed = events.getByName('serviceUpdateFailed').subscribe((ev) => {
        const oldItems = latestState.get(ev.source).items;
        const items = oldItems.map((item) => {
            item.error = { message: 'Service update failed' };
            return item;
        });
        latestState.set(ev.source, { name: ev.source, items });
        pushStateUpdated();
    });

    rxServicesInit = events.getByName('servicesInitializing').subscribe((ev) => {
        latestState.clear();
        ev.details
            .filter((settings) => !settings.disabled)
            .forEach((settings) => {
                const initialState = createInitialStates(settings);
                latestState.set(settings.name, { name: settings.name, items: initialState });
            });
        pushStateUpdated();
    });

    const pushStateUpdated = () => {
        events.push({
            eventName: 'stateUpdated',
            source: 'serviceView',
            details: [...latestState.values()]
        });
    };
};

const dispose = () => {
    rxServiceUpdated.dispose();
    rxServiceUpdateFailed.dispose();
    rxServicesInit.dispose();
};

const createInitialStates = (settings) => settings.projects.map((id) => ({
    id,
    name: id,
    group: null,
    webUrl: null,
    isBroken: false,
    isRunning: false,
    isDisabled: false,
    tags: [],
    changes: [],
    error: null
}));

const createUniqueChanges = (allChanges) => {
    return allChanges ? allChanges.reduce((changes, value) => {
        const alreadyAdded = changes
            .filter((change) => change.name === value.name).length > 0;
        if (!alreadyAdded) {
            changes.push(value);
        }
        return changes;
    }, []) : [];
};

export default {
    init,
    dispose
};

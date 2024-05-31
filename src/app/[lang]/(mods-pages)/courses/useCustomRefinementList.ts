import connectRefinementList from 'instantsearch.js/es/connectors/refinement-list/connectRefinementList.js';
import { useConnector, useRefinementList as _useRefinementList } from 'react-instantsearch-core';

const useCustomRefinementList: typeof _useRefinementList = (props, additionalWidgetProperties) => {

    const overridenConnectRefinementList: typeof connectRefinementList = (renderFn, unmountFn) => {
        const connector = connectRefinementList(renderFn, unmountFn);

        return (props) => {
            const newInstance = connector(props)
            newInstance.dispose = () => {
                if(unmountFn) unmountFn();
            };

            return newInstance;
        };
    }

    return useConnector(overridenConnectRefinementList, props, additionalWidgetProperties);
}

export default useCustomRefinementList;
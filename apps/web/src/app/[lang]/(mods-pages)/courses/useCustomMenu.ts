import connectMenu from "instantsearch.js/es/connectors/menu/connectMenu.js";
import { useConnector, useMenu as _useMenu } from "react-instantsearch-core";

const useCustomMenu: typeof _useMenu = (props, additionalWidgetProperties) => {
  const overridenConnectMenu: typeof connectMenu = (renderFn, unmountFn) => {
    const connector = connectMenu(renderFn, unmountFn);

    return (props) => {
      const newInstance = connector(props);
      newInstance.dispose = () => {
        if (unmountFn) unmountFn();
      };

      return newInstance;
    };
  };

  return useConnector(overridenConnectMenu, props, additionalWidgetProperties);
};

export default useCustomMenu;

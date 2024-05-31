import {useClearRefinements} from 'react-instantsearch';

const ClearAllButton = () => {
    const { refine } = useClearRefinements();
    
    return <button className="text-xs" onClick={refine}>
        Clear all
    </button>
}

export default ClearAllButton;
import useDictionary from '@/dictionaries/useDictionary';
import {useClearRefinements} from 'react-instantsearch';

const ClearAllButton = () => {
    const { refine } = useClearRefinements();
    const dict = useDictionary();
    
    return <button className="text-xs" onClick={refine}>
        {dict.course.refine.clear}
    </button>
}

export default ClearAllButton;
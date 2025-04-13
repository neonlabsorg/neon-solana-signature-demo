import { useCallback } from 'react';
import { UITab } from '../../../models';

interface Props {
  tab: UITab;
  tabs: UITab[];

  selectTab(tab: UITab): void;
}

const FormTabs = (props: Props) => {
  const { tab, tabs, selectTab } = props;

  const classButton = useCallback((t: UITab) => {
    return `button${tab.id === t.id ? ' active' : ''}`;
  }, [tab]);

  return (
    <div className="form-group">
      <div className="form-label !mb-[10px]">
        <label>Contract version</label>
      </div>
      <div className="button-group">
        {tabs.map(t => {
          return <button className={classButton(t)} key={t.id}
                         disabled={t.disabled}
                         onClick={() => selectTab(t)}
                         type="button">{t.title}</button>;
        })}
      </div>
    </div>
  );
};

export default FormTabs;

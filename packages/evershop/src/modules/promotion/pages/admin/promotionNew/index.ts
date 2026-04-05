import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Create a new promotion',
    description: 'Create a new standalone promotion'
  });
};

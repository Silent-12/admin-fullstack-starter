// 接入真实接口时，注释掉下面的 mock 导入，并取消对应的 @/api 导入注释即可。
import { fetchLogin, fetchGetUserInfo } from './auth'
import {
  ACCOUNT_TABLE_DATA,
  ROLE_LIST_DATA,
  fetchGetMenuList,
  fetchGetRoleList,
  fetchGetUserList
} from './system-manage'

export {
  ACCOUNT_TABLE_DATA,
  ROLE_LIST_DATA,
  fetchGetMenuList,
  fetchGetRoleList,
  fetchGetUserList,
  fetchLogin,
  fetchGetUserInfo
}
